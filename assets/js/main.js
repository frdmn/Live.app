$(function() {
	/* Sidebar toggle */ 
	$("#menu-toggle").click(function(e) {
		e.preventDefault();
		$("#wrapper").toggleClass("active");
	});

	/* Modal */ 

	// Open modal
	$(".open-modal").click(function() {
		$(".modal").addClass("modal--open");
	});

	// Close modal
	$(".close-modal").click(function() {
		$(".modal").removeClass("modal--open");
	});

	// Listen on ESC to close modal
	$(document).keyup(function (e) {
		if (e.which == 27) {
			if ($(".modal").hasClass("modal--open")) {
				$(".modal").removeClass("modal--open");
			}
		}
	});

	var settingsFile = '../../settings.json';
	var settings = [];
	$.ajax({
		type: 'GET',
		url: settingsFile,
		dataType: 'json',
		success: function(data) { settings = data;},
		async: false
	});

	console.log(settings.apiKey);

	$.ajaxSetup({
		beforeSend: function(xhr) {
			xhr.setRequestHeader('x-auth', settings.apiKey);
		}
	});

	$.get('https://xboxapi.com/v2/accountXuid', function (data) {
		console.log(data);
	});

});

