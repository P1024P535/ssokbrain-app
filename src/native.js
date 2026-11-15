// 게임(www/index.html)과 기기 기능(광고, 결제, 뒤로 가기)을 잇는 다리.
// 앱 안에서만 window.SsokNative 를 만들고, 웹에서는 아무 일도 하지 않아 게임이 테스트 모드로 동작합니다.
// 각 기능의 상태는 window.ssokDiag 에 적어 두고, 게임의 설정 화면 맨 아래에 표시됩니다.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { store, ProductType, Platform } from 'capacitor-plugin-cdv-purchase';
import CFG from './config.js';

if (Capacitor.isNativePlatform()) {
  const diag = (window.ssokDiag = { native: Capacitor.getPlatform(), ads: 'starting', store: 'starting', auth: 'ready', lastAd: '-' });
  const msg = (e) => String((e && (e.message || e.code)) || e).slice(0, 80);
  // 기기 기능이 응답하지 않을 때 게임이 멈추지 않도록, 정해진 시간이 지나면 실패로 처리합니다.
  const timeout = (p, ms, label) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout')), ms))]);

  /* ---------- 광고 ---------- */
  const loaded = { reward: null, inter: null }; // 미리 불러 둔 광고 (Promise<boolean>)
  const adsReady = (async () => {
    try {
      await timeout(AdMob.initialize({ initializeForTesting: CFG.testAds }), 10000, 'init');
      diag.ads = 'ready';
    } catch (e) {
      diag.ads = 'init failed: ' + msg(e);
    }
    // 유럽 등 동의가 필요한 지역에서만 동의 화면이 뜹니다. 실패해도 광고 준비를 막지 않습니다.
    (async () => {
      try {
        const info = await timeout(AdMob.requestConsentInfo(), 8000, 'consent');
        if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) { /* 동의가 필요 없는 지역이거나 응답 없음 */ }
    })();
  })();

  function preload(kind) {
    const call = kind === 'reward'
      ? AdMob.prepareRewardVideoAd({ adId: CFG.ads.reward, isTesting: CFG.testAds })
      : AdMob.prepareInterstitial({ adId: CFG.ads.inter, isTesting: CFG.testAds });
    loaded[kind] = timeout(call, 20000, 'load').then(
      () => true,
      (e) => { diag.lastAd = kind + ' load failed: ' + msg(e); return false; },
    );
    return loaded[kind];
  }
  adsReady.then(() => { preload('reward'); preload('inter'); });

  async function ad(kind) {
    await adsReady;
    const handles = [];
    const on = async (ev, fn) => handles.push(await AdMob.addListener(ev, fn));
    try {
      let ok = await (loaded[kind] || preload(kind));
      if (!ok) ok = await preload(kind); // 한 번 더 시도
      if (!ok) return false;
      loaded[kind] = null;
      let rewarded = false;
      let closed;
      const done = new Promise((r) => (closed = r));
      const E = kind === 'reward' ? RewardAdPluginEvents : InterstitialAdPluginEvents;
      if (kind === 'reward') await on(E.Rewarded, () => { rewarded = true; });
      await on(E.Dismissed, () => closed());
      await on(E.FailedToShow, (e) => { diag.lastAd = kind + ' show failed: ' + msg(e); closed(); });
      const shown = kind === 'reward' ? AdMob.showRewardVideoAd() : AdMob.showInterstitial();
      shown.then((item) => { if (kind === 'reward' && item && item.amount !== undefined) rewarded = true; }).catch((e) => {
        diag.lastAd = kind + ' show failed: ' + msg(e);
        closed();
      });
      await timeout(done, 180000, 'show').catch(() => {});
      diag.lastAd = kind + (kind === 'reward' ? (rewarded ? ' rewarded' : ' closed early') : ' shown');
      return kind === 'reward' ? rewarded : true;
    } catch (e) {
      diag.lastAd = kind + ' error: ' + msg(e);
      return false;
    } finally {
      handles.forEach((h) => { try { h.remove(); } catch (e) { /* ignore */ } });
      preload(kind); // 다음 광고를 미리 준비
    }
  }

  /* ---------- 결제 ---------- */
  const PLATFORM = Capacitor.getPlatform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
  const keyOf = (pid) => Object.keys(CFG.products).find((k) => CFG.products[k] === pid);
  const ownedKeys = () => Object.keys(CFG.products).filter((k) => !CFG.consumables.includes(k) && store.owned(CFG.products[k]));
  const syncOwned = () => { if (window.ssokOwned) window.ssokOwned(ownedKeys()); };
  let storeReady = Promise.resolve();
  try {
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
    storeReady = timeout(store.initialize([PLATFORM]), 15000, 'store').then(
      () => { const n = Object.values(CFG.products).filter((id) => store.get(id, PLATFORM)).length; diag.store = 'ready, products ' + n + '/' + Object.keys(CFG.products).length; syncOwned(); },
      (e) => { diag.store = 'init failed: ' + msg(e); },
    );
  } catch (e) {
    diag.store = 'setup failed: ' + msg(e);
  }

  async function buy(key) {
    await storeReady;
    try {
      const product = store.get(CFG.products[key], PLATFORM);
      const offer = product && product.getOffer();
      if (!offer) { diag.store = 'product not found: ' + CFG.products[key]; return false; }
      const err = await store.order(offer);
      if (err) diag.store = 'order: ' + msg(err);
      return !err;
    } catch (e) { diag.store = 'order failed: ' + msg(e); return false; }
  }
  function price(key) {
    try {
      const product = store.get(CFG.products[key], PLATFORM);
      return (product && product.pricing && product.pricing.price) || null;
    } catch (e) { return null; }
  }
  async function restore() {
    await storeReady;
    try { await store.restorePurchases(); } catch (e) { diag.store = 'restore failed: ' + msg(e); }
    return ownedKeys();
  }

  /* ---------- 뒤로 가기 버튼 ---------- */
  App.addListener('backButton', () => {
    if (!(window.ssokBack && window.ssokBack())) App.exitApp();
  });

  /* ---------- 구글 로그인 (Firebase Authentication) ---------- */
  const FirebaseAuthentication = registerPlugin('FirebaseAuthentication');
  const toUser = (u) => (u ? { uid: u.uid, name: u.displayName || '', email: u.email || '' } : null);
  async function signIn() {
    try {
      const r = await FirebaseAuthentication.signInWithGoogle();
      diag.auth = 'signed in';
      return toUser(r && r.user);
    } catch (e) {
      diag.auth = 'sign-in failed: ' + msg(e);
      throw e;
    }
  }
  async function signOut() {
    await FirebaseAuthentication.signOut();
    diag.auth = 'signed out';
  }
  async function deleteAccount() {
    try {
      await FirebaseAuthentication.deleteUser();
      diag.auth = 'deleted';
    } catch (e) {
      diag.auth = 'delete failed: ' + msg(e);
      throw e;
    }
  }

  window.SsokNative = { ad, buy, price, restore, signIn, signOut, deleteAccount };
}
