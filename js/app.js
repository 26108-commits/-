/**
 * ==========================================================
 * BEETLE HOUSE (비틀하우스) - 인터랙션 및 프론트엔드 로직 (app.js)
 * ==========================================================
 * 
 * [학습 포인트]
 * 1. Vanilla JavaScript ES6+ 문법 활용 (템플릿 리터럴, 구조 분해 할당, 화살표 함수)
 * 2. 브라우저의 LocalStorage를 활용한 클라이언트 측 장바구니 상태 보존
 * 3. 복합 필터링(카테고리 + 키워드 검색 + 크기 슬라이더 + 성별 셀렉트) 및 정렬 알고리즘
 * 4. 모달 팝업 및 슬라이드 드로어 제어 (접근성 및 키보드 ESC 닫기 포함)
 */

// 애플리케이션 전역 상태(State)
const state = {
  products: PRODUCTS_DATA, // data.js에서 로드된 데이터
  cart: JSON.parse(localStorage.getItem('beetle_cart')) || [],
  theme: localStorage.getItem('beetle_theme') || 'light',
  currentProductModal: null, // 현재 상세 모달에 띄운 상품
  filters: {
    category: 'all',
    search: '',
    minSize: 30, // 30mm는 전체 보기 기준
    gender: 'all',
    sort: 'featured'
  }
};

// ==========================================================
// 1. DOM 요소 캐싱
// ==========================================================
const DOM = {
  // 테마 & 헤더
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  logoBtn: document.getElementById('logoBtn'),
  cartBtn: document.getElementById('cartBtn'),
  cartCountBadge: document.getElementById('cartCountBadge'),

  // 필터 & 검색
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  categoryTabs: document.getElementById('categoryTabs'),
  sizeRangeSlider: document.getElementById('sizeRangeSlider'),
  sizeSliderValue: document.getElementById('sizeSliderValue'),
  genderSelect: document.getElementById('genderSelect'),
  resetFilterBtn: document.getElementById('resetFilterBtn'),

  // 상품 그리드
  productsGrid: document.getElementById('productsGrid'),
  productCount: document.getElementById('productCount'),

  // 상세 모달
  detailModalBackdrop: document.getElementById('detailModalBackdrop'),
  closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
  modalImg: document.getElementById('modalImg'),
  modalCategory: document.getElementById('modalCategory'),
  modalTitle: document.getElementById('modalTitle'),
  modalScientific: document.getElementById('modalScientific'),
  modalDesc: document.getElementById('modalDesc'),
  modalSpecSize: document.getElementById('modalSpecSize'),
  modalSpecGender: document.getElementById('modalSpecGender'),
  modalSpecLineage: document.getElementById('modalSpecLineage'),
  modalSpecOrigin: document.getElementById('modalSpecOrigin'),
  modalSpecEmerged: document.getElementById('modalSpecEmerged'),
  modalSpecFeeding: document.getElementById('modalSpecFeeding'),
  modalSpecTemp: document.getElementById('modalSpecTemp'),
  modalSpecDifficulty: document.getElementById('modalSpecDifficulty'),
  specSizeRow: document.getElementById('specSizeRow'),
  winterPackOpt: document.getElementById('winterPackOpt'),
  summerPackOpt: document.getElementById('summerPackOpt'),
  modalTotalPrice: document.getElementById('modalTotalPrice'),
  modalAddToCartBtn: document.getElementById('modalAddToCartBtn'),

  // 장바구니 드로어
  cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  cartItemList: document.getElementById('cartItemList'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartShippingFee: document.getElementById('cartShippingFee'),
  cartTotal: document.getElementById('cartTotal'),
  checkoutBtn: document.getElementById('checkoutBtn'),

  // 모의 주문 모달
  orderModalBackdrop: document.getElementById('orderModalBackdrop'),
  closeOrderModalBtn: document.getElementById('closeOrderModalBtn'),
  orderFormStep: document.getElementById('orderFormStep'),
  receiptStep: document.getElementById('receiptStep'),
  mockOrderForm: document.getElementById('mockOrderForm'),
  orderSubmitTotal: document.getElementById('orderSubmitTotal'),
  orderName: document.getElementById('orderName'),
  orderAddress: document.getElementById('orderAddress'),
  receiptOrderNo: document.getElementById('receiptOrderNo'),
  receiptName: document.getElementById('receiptName'),
  receiptAddress: document.getElementById('receiptAddress'),
  receiptTotal: document.getElementById('receiptTotal'),
  closeReceiptBtn: document.getElementById('closeReceiptBtn'),

  // 토스트 컨테이너
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================
// 2. 유틸리티 함수
// ==========================================================

// 원화(KRW) 천 단위 콤마 포맷터
const formatPrice = (price) => {
  return price.toLocaleString('ko-KR') + '원';
};

// 토스트 메시지 띄우기
const showToast = (message) => {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span> <div>${message}</div>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
};

// 장바구니 LocalStorage 동기화
const syncCartStorage = () => {
  localStorage.setItem('beetle_cart', JSON.stringify(state.cart));
  updateCartBadge();
};

// 장바구니 상단 배지 개수 갱신
const updateCartBadge = () => {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  DOM.cartCountBadge.textContent = totalCount;
};

// ==========================================================
// 3. 테마 제어 (다크 / 라이트 모드)
// ==========================================================
const applyTheme = (theme) => {
  state.theme = theme;
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    DOM.themeIcon.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    DOM.themeIcon.textContent = '🌙';
  }
  localStorage.setItem('beetle_theme', theme);
};

const toggleTheme = () => {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
};

// ==========================================================
// 4. 상품 필터링 및 렌더링
// ==========================================================
const getFilteredProducts = () => {
  let list = [...state.products];

  // 1) 카테고리 필터
  if (state.filters.category !== 'all') {
    list = list.filter(p => p.category === state.filters.category);
  }

  // 2) 검색어 필터 (이름, 학명, 설명, 산지)
  if (state.filters.search.trim()) {
    const keyword = state.filters.search.toLowerCase().trim();
    list = list.filter(p => 
      p.name.toLowerCase().includes(keyword) ||
      p.scientificName.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.origin.toLowerCase().includes(keyword)
    );
  }

  // 3) 크기 슬라이더 필터 (생체 곤충의 경우 크기 mm 비교)
  if (state.filters.minSize > 30) {
    list = list.filter(p => {
      // 용품(크기 null)은 슬라이더가 30mm를 넘어가면 숨김
      return p.size !== null && p.size >= state.filters.minSize;
    });
  }

  // 4) 성별 필터
  if (state.filters.gender !== 'all') {
    list = list.filter(p => p.gender === state.filters.gender);
  }

  // 5) 정렬
  switch (state.filters.sort) {
    case 'size-desc':
      list.sort((a, b) => (b.size || 0) - (a.size || 0));
      break;
    case 'size-asc':
      list.sort((a, b) => (a.size || 0) - (b.size || 0));
      break;
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'featured':
    default:
      // 기본 추천순 (id 오름차순 또는 인기순)
      list.sort((a, b) => a.id - b.id);
      break;
  }

  return list;
};

// 상품 카드 HTML 동적 렌더링
const renderProducts = () => {
  const filtered = getFilteredProducts();
  DOM.productCount.textContent = filtered.length;

  if (filtered.length === 0) {
    DOM.productsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>조건에 맞는 개체나 상품이 없습니다</h3>
        <p>필터 조건을 변경하거나 검색어를 다시 입력해 보세요.</p>
        <button class="btn-detail" onclick="resetFilters()">모든 필터 초기화</button>
      </div>
    `;
    return;
  }

  DOM.productsGrid.innerHTML = filtered.map(item => {
    // 생체 크기 배지 HTML
    const sizeBadge = item.size 
      ? `<span class="size-pill-badge">📏 ${item.size}mm</span>` 
      : '';

    // 태그 뱃지 클래스 매핑
    const badgeHtml = item.badge 
      ? `<span class="badge-tag ${item.badgeType}">${item.badge}</span>` 
      : '';

    return `
      <article class="product-card" data-id="${item.id}">
        <div class="card-image-wrap">
          ${badgeHtml}
          ${sizeBadge}
          <img src="${item.image}" alt="${item.name}" class="card-img" loading="lazy">
        </div>
        <div class="card-body">
          <div class="card-category">${item.categoryName}</div>
          <h3 class="card-title">${item.name}</h3>
          <div class="card-scientific">${item.scientificName}</div>

          <!-- 스펙 미니 태그 -->
          <div class="spec-mini-tags">
            ${item.gender !== '해당없음' ? `<span class="spec-mini-tag">${item.gender}</span>` : ''}
            ${item.lineage !== '-' ? `<span class="spec-mini-tag">${item.lineage}</span>` : ''}
            <span class="spec-mini-tag">${item.origin}</span>
          </div>

          <div class="card-price-row">
            <span class="card-price">${formatPrice(item.price)}</span>
            <span class="card-stock">잔여: ${item.stock}두</span>
          </div>

          <div class="card-btn-group">
            <button class="btn-detail" onclick="openDetailModal(${item.id})">상세 스펙</button>
            <button class="btn-add-cart" onclick="quickAddToCart(${item.id})">담기 🛒</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
};

// 필터 초기화 함수
window.resetFilters = () => {
  state.filters.category = 'all';
  state.filters.search = '';
  state.filters.minSize = 30;
  state.filters.gender = 'all';
  state.filters.sort = 'featured';

  DOM.searchInput.value = '';
  DOM.sortSelect.value = 'featured';
  DOM.sizeRangeSlider.value = 30;
  DOM.sizeSliderValue.textContent = '전체';
  DOM.genderSelect.value = 'all';

  // 카테고리 버튼 active 리셋
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });

  renderProducts();
};

// ==========================================================
// 5. 개체 상세 모달 (Quick View)
// ==========================================================
window.openDetailModal = (productId) => {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.currentProductModal = product;

  // 모달 데이터 바인딩
  DOM.modalImg.src = product.image;
  DOM.modalImg.alt = product.name;
  DOM.modalCategory.textContent = product.categoryName;
  DOM.modalTitle.textContent = product.name;
  DOM.modalScientific.textContent = product.scientificName;
  DOM.modalDesc.textContent = product.description;

  // 스펙 테이블 바인딩
  if (product.size) {
    DOM.specSizeRow.style.display = 'table-row';
    DOM.modalSpecSize.textContent = `${product.size} mm (디지털 캘리퍼스 정밀 실측)`;
  } else {
    DOM.specSizeRow.style.display = 'none';
  }

  DOM.modalSpecGender.textContent = product.gender;
  DOM.modalSpecLineage.textContent = product.lineage;
  DOM.modalSpecOrigin.textContent = product.origin;
  DOM.modalSpecEmerged.textContent = product.emergedDate;
  DOM.modalSpecFeeding.textContent = product.feedingStatus;
  DOM.modalSpecTemp.textContent = product.tempRange;
  DOM.modalSpecDifficulty.textContent = product.difficulty;

  // 계절 옵션 체크박스 초기화
  DOM.winterPackOpt.checked = false;
  DOM.summerPackOpt.checked = false;

  updateModalPrice();
  DOM.detailModalBackdrop.classList.add('open');
};

const closeDetailModal = () => {
  DOM.detailModalBackdrop.classList.remove('open');
  state.currentProductModal = null;
};

// 모달 내 옵션 체크에 따른 실시간 합계 금액 계산
const updateModalPrice = () => {
  if (!state.currentProductModal) return;

  let total = state.currentProductModal.price;
  if (DOM.winterPackOpt.checked) total += parseInt(DOM.winterPackOpt.value);
  if (DOM.summerPackOpt.checked) total += parseInt(DOM.summerPackOpt.value);

  DOM.modalTotalPrice.textContent = formatPrice(total);
};

// ==========================================================
// 6. 장바구니 로직
// ==========================================================

// 카드에서 바로 담기 (기본 옵션)
window.quickAddToCart = (productId) => {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  addToCart(product, []);
};

// 장바구니 항목 추가
const addToCart = (product, options = []) => {
  // 옵션 계산
  let optionPrice = 0;
  let optionText = options.length > 0 ? options.join(', ') : '기본 포장';
  
  if (options.includes('동절기 보온포장')) optionPrice += 1000;
  if (options.includes('하절기 보냉포장')) optionPrice += 1000;

  const itemKey = `${product.id}-${optionText}`;
  const existingItem = state.cart.find(item => item.key === itemKey);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({
      key: itemKey,
      productId: product.id,
      name: product.name,
      basePrice: product.price,
      price: product.price + optionPrice,
      optionText: optionText,
      image: product.image,
      quantity: 1
    });
  }

  syncCartStorage();
  renderCartItems();
  showToast(`[${product.name}] 장바구니에 담겼습니다.`);
};

// 장바구니 드로어 열기 / 닫기
const openCartDrawer = () => {
  renderCartItems();
  DOM.cartDrawerBackdrop.classList.add('open');
};

const closeCartDrawer = () => {
  DOM.cartDrawerBackdrop.classList.remove('open');
};

// 장바구니 아이템 렌더링 & 금액 계산
const renderCartItems = () => {
  if (state.cart.length === 0) {
    DOM.cartItemList.innerHTML = `
      <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 12px;">🧺</div>
        <p>장바구니가 비어 있습니다.</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">마음에 드는 개체나 사육용품을 담아보세요!</p>
      </div>
    `;
    DOM.cartSubtotal.textContent = '0원';
    DOM.cartShippingFee.textContent = '0원';
    DOM.cartTotal.textContent = '0원';
    DOM.checkoutBtn.disabled = true;
    DOM.checkoutBtn.style.opacity = '0.5';
    return;
  }

  DOM.checkoutBtn.disabled = false;
  DOM.checkoutBtn.style.opacity = '1';

  let subtotal = 0;

  DOM.cartItemList.innerHTML = state.cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-option">${item.optionText}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>

          <div class="cart-item-controls">
            <div class="qty-control">
              <button class="qty-btn" onclick="changeQuantity('${item.key}', -1)">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="changeQuantity('${item.key}', 1)">+</button>
            </div>
            <button class="btn-remove-item" onclick="removeCartItem('${item.key}')">삭제</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 배송비 계산: 50,000원 이상 구매 시 무료 배송, 미만 시 3,500원
  const shippingFee = subtotal >= 50000 ? 0 : 3500;
  const grandTotal = subtotal + shippingFee;

  DOM.cartSubtotal.textContent = formatPrice(subtotal);
  DOM.cartShippingFee.textContent = shippingFee === 0 ? '무료 (5만원 이상)' : formatPrice(shippingFee);
  DOM.cartTotal.textContent = formatPrice(grandTotal);
};

// 수량 증감
window.changeQuantity = (itemKey, delta) => {
  const item = state.cart.find(i => i.key === itemKey);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeCartItem(itemKey);
    return;
  }

  syncCartStorage();
  renderCartItems();
};

// 항목 삭제
window.removeCartItem = (itemKey) => {
  state.cart = state.cart.filter(i => i.key !== itemKey);
  syncCartStorage();
  renderCartItems();
  showToast("선택한 상품이 장바구니에서 삭제되었습니다.");
};

// ==========================================================
// 7. 모의 주문 및 가상 영수증
// ==========================================================
const openOrderModal = () => {
  if (state.cart.length === 0) {
    alert("장바구니에 상품을 먼저 담아주세요!");
    return;
  }

  // 드로어 닫고 주문 모달 열기
  closeCartDrawer();

  // 1단계 작성 폼 보이기
  DOM.orderFormStep.style.display = 'block';
  DOM.receiptStep.style.display = 'none';

  // 총액 갱신
  DOM.orderSubmitTotal.textContent = DOM.cartTotal.textContent;
  DOM.orderModalBackdrop.classList.add('open');
};

const closeOrderModal = () => {
  DOM.orderModalBackdrop.classList.remove('open');
};

const handleOrderSubmit = (e) => {
  e.preventDefault();

  const name = DOM.orderName.value.trim() || '김충우';
  const address = DOM.orderAddress.value.trim() || '서울시 마포구 월드컵북로 123';
  const totalStr = DOM.cartTotal.textContent;

  // 가상 주문번호 생성 (BH-20260907-XXXX)
  const randomNo = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `BH-20260907-${randomNo}`;

  // 영수증 바인딩
  DOM.receiptOrderNo.textContent = orderNumber;
  DOM.receiptName.textContent = name;
  DOM.receiptAddress.textContent = address;
  DOM.receiptTotal.textContent = totalStr;

  // 2단계 영수증 화면으로 전환
  DOM.orderFormStep.style.display = 'none';
  DOM.receiptStep.style.display = 'block';

  // 장바구니 비우기
  state.cart = [];
  syncCartStorage();
  renderCartItems();

  showToast(`주문이 완료되었습니다! (주문번호: ${orderNumber})`);
};

// ==========================================================
// 8. 이벤트 리스너 등록 & 초기화
// ==========================================================
const attachEventListeners = () => {
  // 테마 토글
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // 로고 클릭 시 맨 위로 & 필터 초기화
  DOM.logoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetFilters();
  });

  // 검색 인풋 실시간 반영
  DOM.searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    renderProducts();
  });

  // 정렬 셀렉트
  DOM.sortSelect.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    renderProducts();
  });

  // 카테고리 탭 클릭
  DOM.categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.filters.category = btn.dataset.category;
    renderProducts();
  });

  // 크기 슬라이더
  DOM.sizeRangeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    state.filters.minSize = val;
    DOM.sizeSliderValue.textContent = val === 30 ? '전체' : `${val}mm 이상`;
    renderProducts();
  });

  // 성별 셀렉트
  DOM.genderSelect.addEventListener('change', (e) => {
    state.filters.gender = e.target.value;
    renderProducts();
  });

  // 필터 초기화 버튼
  DOM.resetFilterBtn.addEventListener('click', resetFilters);

  // 상세 모달 옵션 체크박스
  DOM.winterPackOpt.addEventListener('change', updateModalPrice);
  DOM.summerPackOpt.addEventListener('change', updateModalPrice);

  // 상세 모달에서 장바구니 담기 버튼
  DOM.modalAddToCartBtn.addEventListener('click', () => {
    if (!state.currentProductModal) return;

    const options = [];
    if (DOM.winterPackOpt.checked) options.push('동절기 보온포장');
    if (DOM.summerPackOpt.checked) options.push('하절기 보냉포장');

    addToCart(state.currentProductModal, options);
    closeDetailModal();
  });

  // 모달 닫기 버튼들
  DOM.closeDetailModalBtn.addEventListener('click', closeDetailModal);
  DOM.detailModalBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.detailModalBackdrop) closeDetailModal();
  });

  // 장바구니 드로어 열기 / 닫기
  DOM.cartBtn.addEventListener('click', openCartDrawer);
  DOM.closeCartBtn.addEventListener('click', closeCartDrawer);
  DOM.cartDrawerBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.cartDrawerBackdrop) closeCartDrawer();
  });

  // 모의 주문서 열기
  DOM.checkoutBtn.addEventListener('click', openOrderModal);
  DOM.closeOrderModalBtn.addEventListener('click', closeOrderModal);
  DOM.orderModalBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.orderModalBackdrop) closeOrderModal();
  });

  // 주문 폼 제출
  DOM.mockOrderForm.addEventListener('submit', handleOrderSubmit);
  DOM.closeReceiptBtn.addEventListener('click', closeOrderModal);

  // 키보드 ESC 키를 누르면 열려있는 모달 닫기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeCartDrawer();
      closeOrderModal();
    }
  });
};

// 앱 초기화 실행
const init = () => {
  applyTheme(state.theme);
  updateCartBadge();
  attachEventListeners();
  renderProducts();
};

// DOM이 준비되면 실행
document.addEventListener('DOMContentLoaded', init);
