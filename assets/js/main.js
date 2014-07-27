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
        $.bootstrapGrowl('No data to show. Refresh to show settings modal again in three seconds.', { type: 'info' });
        setTimeout(function() {
            location.reload();
        }, 3000);
    });

    // Listen on ESC to close modal
    $(document).keyup(function (e) {
        if (e.which == 27) {
            if ($(".modal").hasClass("modal--open")) {
                $(".modal").removeClass("modal--open");
            }
        }
    });

    /* Load settings (synchronously) out of the settings.json file */

    var settingsFile = '../../settings.json';
    var settings = [];
    $.ajax({
        type: 'GET',
        url: settingsFile,
        dataType: 'json',
        success: function(data) { settings = data;},
        async: false
    });

    // Check for existing settings in PouchDB
    retrieveDbData('settings', function(data){

        // If no existing settings db open modal to gather user input,
        // otherwise continue page rendering
        if (!data) {
            $(".modal").addClass("modal--open");

            // Submit API key on submit
            $('.submit-button').click(function (){
                $.bootstrapGrowl('Trying to connect to XboxAPI.com...', { type: 'info' });
                $(this).attr("disabled", true);
                $(".modal input").prop('disabled', true);

                settingsData = {};
                settingsData.apiKey = $('.modal input').val();

                // Check API key
                checkApiKey(settingsData.apiKey, function(data){

                    // If invalid API key show notification 
                    // otherwise execute function to save settings
                    if (!data) {
                        $.bootstrapGrowl('API key seems invalid. Please check!', { type: 'danger' });
                        $('.submit-button').attr("disabled", false);
                        $(".modal input").prop('disabled', false);
                    } else {

                        settingsData.xuid = data.xuid;
                        settingsData.gamerTag = data.gamerTag;

                        submitDbData(settingsData, 'settings', function(){
                            if (!data) {
                                console.log("[ERROR] Couldn't transfer settings into database");
                            } else {
                                console.log("[INFO] Settings successfully saved");
                                $.bootstrapGrowl('Valid API key! Successfully saved', { type: 'success' });
                                // Wait 2 seconds for the notfication, then reload to show the dashboard
                                setTimeout(function() {
                                    location.reload();
                                }, 2000);    
                            }
                        });
                    }
                });
            });
        } else {
            console.log('[INFO] API key: ' + data.apiKey);

            // Test call to render the friends in the sidebar
            apiCall(data.apiKey, '/' + data.xuid + '/friends', settings.cache.friends, function(data){
                var friends = data;
                // Remove loading element
                $('.friendlist').html('');
                // Add button for each friend
                $(friends).each(function(k,v) {
                    $('.friendlist').append('\
<li>\
    <button class="pseudobutton open-modal">\
        <span class="sidebar-avatar">\
            <img src="http://avatar.xboxlive.com/avatar/' + encodeURIComponent(v.GameDisplayName) + '/avatarpic-l.png"> \
        </span>\
        ' + v.GameDisplayName + '\
    </button>\
</li>');
                });
            });

            // Test call to render messages
            apiCall(data.apiKey, '/messages', settings.cache.messages, function(data){
                var messages = data;
                var i = 0;
                // Clear timeline
                $('.timeline').html('');
                // Add button for each friend
                $(messages).each(function(k,v) {
                    var liClass ='';
                    if(i%2 === 0){
                        liClass='class="timeline-inverted"';
                    }
                    if (v.header.hasText) {
                        i++;
                        $('.timeline').append('\
<li ' + liClass + '>\
  <div class="timeline-badge"><img src="http://avatar.xboxlive.com/avatar/' + encodeURIComponent(v.header.sender) + '/avatarpic-l.png"></div>\
  <div class="timeline-panel">\
    <div class="timeline-heading">\
      <h4 class="timeline-title">' + v.header.sender + '</h4>\
      <p><small class="text-muted"><i class="glyphicon glyphicon-time"></i> ' + v.header.sent + '</small></p>\
    </div>\
    <div class="timeline-body">\
      <p>' + v.messageSummary + '</p>\
    </div>\
  </div>\
</li>');
                    }
                });
            });
        }
    });
});

