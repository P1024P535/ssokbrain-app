// 쏙브레인 앱 설정. 출시 전에 아래 값을 실제 값으로 바꿉니다.
export default {
  // true면 구글의 테스트 광고만 나옵니다. 출시 빌드에서는 false로 바꿉니다.
  testAds: true,
  ads: {
    // AdMob 광고 단위 ID. 지금 값은 구글이 공개한 테스트용 ID입니다.
    reward: 'ca-app-pub-3940256099942544/5224354917',
    inter: 'ca-app-pub-3940256099942544/1033173712',
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
