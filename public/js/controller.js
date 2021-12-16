var app = angular.module('mostrx', []);

app.controller('MostRxController', function($scope, $attrs) {
	var controller = this, PharmacyGroup = function(id, name) {
		this.id = id;
		this.name = name;
		this.count = 1;
		
		this.add = function() {
			this.count++;
		};
	};
	
	$.extend($scope, {
		clearHistory: function() {
			localStorage.removeItem('recent');
			$scope.recentDrugs = null;
		},
		customQuantity: 135,
		drugName: $attrs.drug.replace(/-/g, ' '),
		enteredQuantity: function(customQuantity) {
			if (!isNaN(customQuantity)) {
				$scope.selections.quantity.amt = +customQuantity;
			}
		},
		expandPharmacies: function() {
			$scope.showAllPharmacies = true;
		},
		formatPrice: function(price) {
			return controller.formatter.format(price);
		},
		goToPage: function(page) {
			if ($scope.coupons.length) {
				$scope.currentPage = page;
			}
		},
		initTable: function() {
			$scope.coupons = [];
			$scope.currentPage = 1;
			$scope.pharmacies = [];
		},
		isLoading: true,
		nextPage: function() {
			$scope.goToPage(Math.min($scope.currentPage + 1, Math.ceil($scope.coupons.length / controller.rpp)));
		},
		openCoupon: function(url) {
			window.open('/coupon/' + encodeURIComponent(btoa(url)));
		},
		orderedStrengths: function() {
			if (!$scope.selections.hasOwnProperty('form')) {
				return [];
			}
			
			var strengths = Object.keys($scope.selections.form.strengths);
			strengths.sort();
			
			return strengths;
		},
		lookupDrug: function() {
			$scope.isLoading = true;
			var fmt = $scope.drugName.formatSlug();
			
			$.getJSON('/api/v1/drug/variations/' + encodeURIComponent($scope.drugName), function(data) {
				if (data.error) {
					window.location.href = '/';
					
					return;
				}
				
				document.title = fmt + ' Coupons | MostRx';
				localStorage.setItem('recent', JSON.stringify(controller.addRecent(fmt)));
				
				$scope.$apply(function() {
					$scope.options = data.variations;
					$scope.selections.brand = controller.getDefaultBrand();
					$scope.selections.form = controller.getDefaultForm();
					$scope.selections.strength = controller.getDefaultStrength();
					$scope.selections.quantity = controller.getDefaultQuantity();
				});
				
				setTimeout($scope.updateTable, 1000);
			});
		},
		pages: function() {
			var coupons = controller.filterCoupons(), pages = [1], i = 2;
			
			for (i; i <= Math.ceil(coupons.length / controller.rpp) && !$scope.isLoading; i++) {
				pages.push(i);
			}
			
			return pages;
		},
		prevPage: function() {
			$scope.goToPage(Math.max(1, $scope.currentPage - 1));
		},
		recentDrugs: JSON.parse(localStorage.getItem('recent')),
		search: function(q) {
			if (controller.searchTimer) {
				clearTimeout(controller.searchTimer);
			}			
			
			if (q) {
				$scope.isSearching = true;
				
				controller.searchTimer = setTimeout(function() {
					$.getJSON('/api/v1/drug/search/' + encodeURIComponent(q), function(json) {
						if (json.query == q) {
							$scope.$apply(function() {
								$scope.searchResults = json.results;
								$scope.isSearching = false;
							});
						}
					});
				}, 400);
			} else {
				$scope.searchResults = [];
			}
		},
		searchResults: [],
		selections: {},
		selectBrand: function(key) {
			$scope.selections.brand = $scope.options[key];
			controller.validate();
		},
		selectDrug: function(slug, event) {
			if (event) {
				event.preventDefault();
			}
			
			history.pushState({}, '', '/rx/' + slug.toSlug());
			$scope.drugName = slug.formatSlug();
			$scope.lookupDrug();
		},
		selectForm: function(key) {
			$scope.selections.form = $scope.selections.brand.forms[key];
			controller.validateStrength();
			controller.validateQuantity();
		},
		selectQuantity: function(key) {
			$scope.selections.quantity = $scope.selections.strength.quantities[key];
		},
		selectStrength: function(key) {
			$scope.selections.strength = $scope.selections.form.strengths[key];
			controller.validateQuantity();
		},
		showAllPharmacies: false,
		topDrugs: ['Lipitor', 'Viagra', 'Norvasc', 'Lexapro', 'Zoloft', 'Cozaar', 'Cymbalta', 'Protonix', 'omeprazole', 'levofloxacin'],
		updateTable: function() {
			$scope.initTable();
			$scope.isLoading = true;
			var rid = Math.floor(Math.random() * 1000000000), brandSlug = controller.getBrand().toSlug(), lat = controller.latlng[0], lng = controller.latlng[1];
			controller.validate();
			var sel = $scope.selections, slug = sel.brand.name.toSlug(), gb = $scope.selections.brand.isGeneric ? 'G' : 'B';
			
			var encodedParams = [$scope.drugName, sel.quantity.ndc, slug, brandSlug, gb, sel.form.name, sel.strength.strength, sel.quantity.amt, $scope.zipCode, lat, lng, controller.attempt, rid].map(function(param) {
				return encodeURIComponent(param);
			});
			
			controller.request = $.getJSON(
				'/api/v1/coupons/' + encodedParams.join('/'),
				function(json) {
					if (json.rid != rid) {
						return;
					}
					
					var processed = controller.processResponses(Object.values(json.data));
				
					$scope.$apply(function() {
						$scope.currentPage = 1;
						$scope.coupons = processed.coupons;
						$scope.pharmacies = processed.pharmacies;
						$scope.isLoading = false;
					});
					
					controller.attempt = 1;
				}
			).catch(function() {
				controller.attempt++;
				
				if (controller.attempt > 4) {
					$scope.$apply(function() {
						$scope.isLoading = false;
					});
				} else {
					setTimeout($scope.updateTable, 1000);
				}
			});
		},
		validateZip: function(zipCode) {
			if (!zipCode || zipCode.replace(/[^0-9]/g, '').length !== 5) {
				zipCode = controller.defaultZip;
			}
			
			controller.lookupZip(zipCode);
		},
		visibleCoupons: function() {
			var page = $scope.currentPage, rpp = controller.rpp;
			
			return controller.filterCoupons().slice(rpp * (page - 1), rpp * page);
		}
	});
	
	$.extend(controller, {
		_getDefault: function(options) {
			if (!$.isArray(options)) {
				options = Object.values(options);
			}
			
			for (key of ['isDefault', 'isGeneric', 'constructor']) {
				for (opt of options) {
					if (opt[key]) {
						return opt;
					}
				}
			}
		},
		addRecent: function(selection) {
			var recent = localStorage.getItem('recent');
			
			if (recent) {
				recent = JSON.parse(recent).filter(function(drug) {
					return drug != selection;
				});
				
				recent.unshift(selection);
				recent = recent.slice(0, 10);
			} else {
				recent = [selection];
			}
			
			return recent;
		},
		attempt: 1,
		defaultZip: '77449',
		filterCoupons: function() {
			var selectedPharmacies = $('input[data-pharmacy]:checked').map(function() {
				return $(this).data('pharmacy');
			}).get();
			
			return $scope.coupons.filter(function(coupon) {
				var id = controller.standardizePharmacy(coupon.pharmacy);
				
				return !selectedPharmacies.length || selectedPharmacies.includes(id);
			});
		},
		formatter: new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}),
		getBrand: function() {
			for (opt of Object.values($scope.options)) {
				if (!opt.isGeneric) {
					return opt.name;
				}
			}
			
			return $scope.selections.brand.name;
		},
		getDefaultBrand: function() {
			return controller._getDefault($scope.options);
		},
		getDefaultForm: function() {
			return controller._getDefault($scope.selections.brand.forms);
		},
		getDefaultQuantity: function() {
			return controller._getDefault($scope.selections.strength.quantities);
		},
		getDefaultStrength: function() {
			return controller._getDefault($scope.selections.form.strengths);
		},
		latlng: (function(lat, lng) {
			return lat && lng ? [lat, lng] : ['-95.73154475', '29.82955575'];
		})(localStorage.getItem('lat'), localStorage.getItem('lng')),
		lookupZip: function(zipCode) {
			$scope.zipCode = zipCode;
			$scope.loadingZip = zipCode;
			
			$.getJSON('/data/zip/zip' + zipCode.substring(0, 1) + '.json', function(map) {
				if ($scope.loadingZip === zipCode) {
					controller.latlng = map[zipCode];
					controller.latlng.reverse();
					localStorage.setItem('zipCode', zipCode);
					localStorage.setItem('lat', controller.latlng[0]);
					localStorage.setItem('lng', controller.latlng[1]);
					
					$scope.$apply(function() {
						delete $scope.loadingZip;
					});
				}
			}).catch(function() {
				
			});
		},
		processResponses: function(responses) {
			var pharmacies = {}, coupons = responses.flatMap(function(response) {
				return response.length ? response[0].coupons : response.coupons;
			});
			
			for (coupon of coupons) {
				var key = controller.standardizePharmacy(coupon.pharmacy);
				
				if (pharmacies.hasOwnProperty(key)) {
					pharmacies[key].add();
				} else {
					pharmacies[key] = new PharmacyGroup(key, coupon.pharmacy);
				}
			}
			
			coupons.sort(function(a, b) {
				return a.price - b.price;
			});
			
			pharmacies = Object.values(pharmacies).sort(function(a, b) {
				return b.count - a.count;
			});
			
			return {
				pharmacies: pharmacies,
				coupons: coupons
			};
		},
		retried: false,
		rpp: 10,
		standardizePharmacy: function(name) {
			return name
				.replace(' PHARMACY DEPT.', '')
				.replace(' PHARMACY', '')
				.replace(' FOOD', '')
				.replace(' GROCERY', '')
				.replace(/[^A-Za-z]/g, '')
				.replace('MARKETSINC', '');
		},
		validate: function() {
			controller.validateForm();
			controller.validateStrength();
			controller.validateQuantity();
		},
		validateForm: function() {
			var forms = Object.keys($scope.selections.brand.forms);
			
			if (!forms.includes($scope.selections.form.name)) {
				$scope.selections.form = controller.getDefaultForm();
			}		
		},
		validateQuantity: function() {
			var quantities = Object.keys($scope.selections.strength.quantities);
			
			if (!quantities.includes($scope.selections.quantity)) {
				$scope.selections.quantity = controller.getDefaultQuantity();
			}
		},
		validateStrength: function() {
			var strengths = Object.keys($scope.selections.form.strengths);
			
			if (!strengths.includes($scope.selections.strength.strength)) {
				$scope.selections.strength = controller.getDefaultStrength();
			}
		}
	});
	
	$scope.initTable();
	$scope.zipCode = localStorage.getItem('zipCode') || controller.defaultZip;
	
	if ($scope.drugName) {
		$scope.lookupDrug();
	}
});
