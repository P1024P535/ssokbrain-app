// 쏙브레인 앱 설정. 출시 전에 아래 값을 실제 값으로 바꿉니다.
export default {
  // 테스트 파일(APK)에서는 true라서 구글의 테스트 광고만 나오고,
  // 출시 파일(AAB)을 만들 때만 false가 되어 실제 광고가 나옵니다. (scripts/build.mjs 가 정합니다)
  // eslint-disable-next-line no-undef
  testAds: __TEST_ADS__,
  ads: {
    // 쏙컴퍼니 AdMob 광고 단위 ID
    reward: 'ca-app-pub-8529047857122990/5995178575', // 코인 보상 (보상형)
    inter: 'ca-app-pub-8529047857122990/9672513794', // 문제 사이 (전면)
  },
  // 게임 안 상품 ID -> 구글 플레이 콘솔에 등록할 상품 ID
  products: {
    c300: 'coins_300',
    c1000: 'coins_1000',
    c3000: 'coins_3000',
    noads: 'no_ads',
    santa: 'outfit_santa',
    astro: 'outfit_astro',
  },
  consumables: ['c300', 'c1000', 'c3000'],
};
