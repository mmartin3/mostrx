String.prototype.toSlug = function() {
	return this.split(/[^A-Za-z0-9]/).join('-').toLowerCase()
};

String.prototype.formatSlug = function() {
	return this.split(/[^A-Za-z0-9]/).map(function(s) {
		if (s.length <= 2) {
			return s.toUpperCase();
		} else {
			return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
		}
	}).join(' ');
};

$(document).ready(function() {
	var toggleDropdown = function(display) {
		return function() {
			setTimeout(function() {
				$('.dropdown-menu.autocomplete').toggleClass('show', display);
			}, 100);
		};
	};
	
	setTimeout(function() {
		$('ins:empty').replaceWith('<a href="https://apps.apple.com/us/app/txtrivia/id1558247220" target="_blank"><img src="/images/txtriviabanner.png" class="w-50"></a>');
	}, 1000);
	
	$(document)
		.on('focus', 'input.autocomplete', toggleDropdown(true))
		.on('blur', 'input.autocomplete', toggleDropdown(false));
});
