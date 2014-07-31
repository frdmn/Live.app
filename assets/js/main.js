$(function() {
    /* Sidebar toggle */ 

    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("active");
    });

    /* Modal stuff */

    // Reload if initial settings modal gets closed without success
    $('.modal#settings').on('hidden.bs.modal', function () {
        // Check for existing settings in PouchDB
        retrieveDbData('settings', function(data){
            // Reload, if no settings in database to show settings modal again
            if (!data) {
                location.reload();
            }
        });
    });

    // Clear input and textareas on close of compose window 
    $('.modal#composemessage').on('hidden.bs.modal', function () {
        $('.modal#composemessage textarea').html('');
        $('.modal#composemessage select.chosen-recipients').empty();
        $('.modal#composemessage select.chosen-recipients').trigger("chosen:updated");
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

    /* Execute function to clear local DBs */
  
    $(".clearlocaldb-submit").click(function(e) {
        // Disable login button to prevent duplicate submits
        $(this).attr("disabled", "disabled");

        // Execute listPouchDBs
        listPouchDBs(function(data){
            // For each database, execute function to delete
            $(data).each(function(k,v){
                deletePouchDB(v, function(callback){
                    if (callback) {
                        console.log('[INFO] Destroyed local database "' + v + '"');
                    } else {
                        console.log('[ERROR] Couldn\'t destroy local database "' + v + '"');
                    }
                });
            });
         
            // Initiate refresh, to show first start modal again
            console.log('[INFO] Refresh in 1.5 seconds');
            setTimeout(function(){
                location.reload();
            }, 1500);
        });
    });

    // Check for existing settings in PouchDB
    retrieveDbData('settings', function(data){

        // If no existing settings db open modal to gather user input,
        // otherwise continue page rendering
        if (!data) {
            $('.modal#settings').modal('show');

            // Submit API key on submit
            $('.modal#settings .submit-button').click(function (){
                $.bootstrapGrowl('Trying to connect to XboxAPI.com...', { type: 'info' });
                $(this).attr("disabled", true);
                $(".modal#settings input").prop('disabled', true);

                settingsData = {};
                settingsData.apiKey = $('.modal input').val();

                // Check API key
                checkApiKey(settingsData.apiKey, function(data){

                    // If invalid API key show notification 
                    // otherwise execute function to save settings
                    if (!data) {
                        $.bootstrapGrowl('API key seems invalid. Please check!', { type: 'danger' });
                        $('.modal#settings .submit-button').attr("disabled", false);
                        $(".modal#settings input").prop('disabled', false);
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

            /* Execute function to send message on submit */
    
            $('.modal#composemessage .submit-button').click(function(e) {
                // Disable login button to prevent duplicate submits
                $(this).attr("disabled", "disabled");

                // Selector helpers and temporary objects
                var recipientsSelector = '.modal#composemessage select.chosen-recipients',
                    messageSelector = '.modal#composemessage textarea',
                    recipientsObject = [],
                    messageObject;

                $(recipientsSelector+' option:selected').each(function(){
                    recipientsObject.push($(this).val());
                });

                messageObject = $(messageSelector).val();

                // Try to send message
                sendMessage(data.apiKey, recipientsObject, messageObject, function(data){
                    if (!data) {
                        $(this).attr("disabled", "enabled");
                        $.bootstrapGrowl('Error while sending message :(', { type: 'danger' });
                        console.log("[ERROR] Couldn't send message - ", recipients, message);
                    } else {
                        $(this).attr("disabled", "enabled");
                        $.bootstrapGrowl('Message successfully sent!', { type: 'success' });
                        console.log("[INFO] Message successfully sent!", recipients, message);
                    }
                });
            });

            // Test call to render the friends in the sidebar
            apiCall(data.apiKey, '/' + data.xuid + '/friends', settings.cache.friends, function(data){
                var friends = data;
                // Remove loading element
                $('.friendlist').html('');
                // Add button for each friend
                $(friends).each(function(k,v) {
                    $('.friendlist').append('\
<li>\
    <button class="pseudobutton" data-xuid="' + v.id + '" data-gamertag="' + v.GameDisplayName + '">\
        <span class="sidebar-avatar">\
            <img src="http://avatar.xboxlive.com/avatar/' + encodeURIComponent(v.GameDisplayName) + '/avatarpic-l.png"> \
        </span>\
        ' + v.GameDisplayName + '\
    </button>\
</li>');
                });

                // Add click() function to open #composemessage modal
                $('.pseudobutton').click(function(e) {
                    recipientsList = [];
                    recipientObject = {};

                    recipientObject.gamertag = $(this).data('gamertag');
                    recipientObject.xuid = $(this).data('xuid');

                    recipientsList.push(recipientObject);

                    renderModal(recipientsList);
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

