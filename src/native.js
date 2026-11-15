// 게임(www/index.html)과 기기 기능(광고, 결제, 뒤로 가기)을 잇는 다리.
// 앱 안에서만 window.SsokNative 를 만들고, 웹에서는 아무 일도 하지 않아 게임이 테스트 모드로 동작합니다.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';
import CFG from './config.js';

if (Capacitor.isNativePlatform()) {
  const PLATFORM = Capacitor.getPlatform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
  const keyOf = (pid) => Object.keys(CFG.products).find((k) => CFG.products[k] === pid);
  const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

  /* ---------- 광고 ---------- */
  const adsReady = (async () => {
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
    } catch (e) { /* 동의 화면이 필요 없는 지역 */ }
    try { await AdMob.initialize(); } catch (e) { console.warn('AdMob init failed', e); }
  })();

  async function ad(kind) {
    await adsReady;
    const handles = [];
    const on = async (ev, fn) => handles.push(await AdMob.addListener(ev, fn));
    try {
      if (kind === 'reward') {
        let rewarded = false;
        let closed;
        const done = new Promise((r) => (closed = r));
        await on(RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
        await on(RewardAdPluginEvents.Dismissed, () => closed());
        await on(RewardAdPluginEvents.FailedToShow, () => closed());
        await withTimeout(AdMob.prepareRewardVideoAd({ adId: CFG.ads.reward, isTesting: CFG.testAds }), 15000, Promise.reject(new Error('timeout')));
        await AdMob.showRewardVideoAd();
        await withTimeout(done, 120000);
        return rewarded;
      }
      let closed;
      const done = new Promise((r) => (closed = r));
      await on(InterstitialAdPluginEvents.Dismissed, () => closed());
      await on(InterstitialAdPluginEvents.FailedToShow, () => closed());
      await withTimeout(AdMob.prepareInterstitial({ adId: CFG.ads.inter, isTesting: CFG.testAds }), 8000, Promise.reject(new Error('timeout')));
      await AdMob.showInterstitial();
      await withTimeout(done, 120000);
      return true;
    } catch (e) {
      console.warn('ad failed', kind, e);
      return false;
    } finally {
      handles.forEach((h) => { try { h.remove(); } catch (e) { /* ignore */ } });
    }
  }

  /* ---------- 결제 ---------- */
  const ownedKeys = () => Object.keys(CFG.products).filter((k) => !CFG.consumables.includes(k) && store.owned(CFG.products[k]));
  const syncOwned = () => { if (window.ssokOwned) window.ssokOwned(ownedKeys()); };

  store.register(Object.keys(CFG.products).map((k) => ({
    id: CFG.products[k],
    type: CFG.consumables.includes(k) ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
    platform: PLATFORM,
  })));
  store.when().approved((tx) => {
    // 이미 지급이 끝난 구매(앱을 다시 켰을 때 다시 전달되는 것)는 보유 상태만 맞춥니다.
    if (tx.isAcknowledged) { tx.finish(); syncOwned(); return; }
    (tx.products || []).forEach((p) => { const k = keyOf(p.id); if (k && window.ssokGrant) window.ssokGrant(k); });
    tx.finish();
  });
  const storeReady = store.initialize([PLATFORM]).then(syncOwned).catch((e) => console.warn('store init failed', e));

  async function buy(key) {
    await storeReady;
    const product = store.get(CFG.products[key], PLATFORM);
    const offer = product && product.getOffer();
    if (!offer) return false;
    const err = await store.order(offer);
    return !err;
  }
  function price(key) {
    const product = store.get(CFG.products[key], PLATFORM);
    return (product && product.pricing && product.pricing.price) || null;
  }
  async function restore() {
    await storeReady;
    await store.restorePurchases();
    return ownedKeys();
  }

  /* ---------- 뒤로 가기 버튼 ---------- */
  App.addListener('backButton', () => {
    if (!(window.ssokBack && window.ssokBack())) App.exitApp();
  });

  window.SsokNative = { ad, buy, price, restore };
}
