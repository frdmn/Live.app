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

	/* Load settings */

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

	/* Block interactions */

	$.blockUI({ 
		css: { 
			border: 'none', 
			padding: '10px', 
			backgroundColor: '#000', 
			'-webkit-border-radius': '4px', 
			'-moz-border-radius': '4px', 
			opacity: 0.5,
			color: '#fff'
		},
		message: "Checking API key..."
	}); 

	/* Initial API check */

	$.ajaxSetup({
		beforeSend: function(xhr) {
			xhr.setRequestHeader('X-AUTH', settings.apiKey);
		}
	});

	$.get('https://xboxapi.com/v2/accountXuid', function (data) {
		console.log(data);
		// Unblock interactions
		$.unblockUI();
        $.bootstrapGrowl("API connection successful established :)", { type: 'success' });
	}).fail(function() {
		// Unblock interactions
		$.unblockUI();
		// Send notification
        $.bootstrapGrowl("Couldn't establish API connection :(", { type: 'danger' });
	});

   
});

