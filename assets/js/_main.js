$(function() {
    /* If node-webkit open dev tools on specific shortcut */

    $(window).keydown(function(e) {
        // If ⌘ + 0 (Mac) or CTRL + 0 (Windows)
        if ((e.keyCode == 48 && e.metaKey) || (e.keyCode == 48 && e.ctrlKey)) {
            // Check if require exists (node-webkit)
            if (require) { 
                var gui = require('nw.gui');
                var win = gui.Window.get();
                // Show dev tools
                win.showDevTools();
            }
        }
    });

    /* Sidebar toggle */ 

    $("#menu-toggle").click(function(e) {
        // Prevent stadard <button> behaviour
        e.preventDefault();
        // Toggle "active" class
        $("#wrapper").toggleClass("active");
        // Write log
        log.info('[INFO] Sidebar toggled');
    });

    /* Modal stuff */

    // Reload if initial settings modal gets closed without success
    $('.modal#settings').on('hidden.bs.modal', function () {
        // Write log
        log.debug('[DEBUG] Settings modal closed => reload Live.app');
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
        // Write log
        log.debug('[DEBUG] Inputs in $(\'#composemessage\') modal cleared');
    });

    /* Load settings (synchronously) out of the settings.json file */

    var settingsFile = 'settings.json';
    var settings = [];
    $.ajax({
        type: 'GET',
        url: settingsFile,
        dataType: 'json',
        success: function(data) { 
            settings = data; 
            log.setLevel(settings.logging); 
            log.info('[INFO] Using "' + settings.logging + '" log level'); 
            log.debug('[DEBUG] Settings stored in variable'); },
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
                        log.info('[INFO] Destroyed local database "' + v + '"');
                    } else {
                        log.error('[ERROR] Couldn\'t destroy local database "' + v + '"');
                    }
                });
            });
         
            // Initiate refresh, to show first start modal again
            log.debug('[DEBUG] Refresh in 1.5 seconds');
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
            log.debug('[DEBUG] Couldn\'t find "settings" database. Proceed to show initial setup modal');
            $('.modal#settings').modal('show');

            // Submit API key on submit
            $('.modal#settings .submit-button').click(function (){
                settingsData = {};
                settingsData.apiKey = $('.modal input').val();

                log.info('[INFO] Trying to connect to XboxAPI.com using the API key: "' + settingsData.apiKey + '"');

                $(this).attr("disabled", true);
                $(".modal#settings input").prop('disabled', true);

                // Check API key
                checkApiKey(settingsData.apiKey, function(data){
                    // If invalid API key show notification 
                    // otherwise execute function to save settings
                    if (!data) {
                        $('.modal#settings .submit-button').attr("disabled", false);
                        $(".modal#settings input").prop('disabled', false);
                    } else {
                        settingsData.xuid = data.xuid;
                        settingsData.gamerTag = data.gamerTag;

                        submitDbData(settingsData, 'settings', function(){
                            if (data) {                              
                                // Wait 2 seconds for the notfication, then reload to show the dashboard
                                log.debug("[DEBUG] Wait 2 seconds, then reload");
                                setTimeout(function() {
                                    location.reload();
                                }, 2000);    
                            }
                        });
                    }
                });
            });
        } else {
            log.info('[INFO] "settings" database found. Using API key: ' + data.apiKey);
            
            // Init variable to store API key out of DB
            var DBapiKey = data.apiKey;

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
                    log.debug('Recipient found: "' + $(this).val() + '"');
                    recipientsObject.push($(this).val());
                });

                messageObject = $(messageSelector).val();

                // Try to send message
                sendMessage(DBapiKey, recipientsObject, messageObject, function(data){
                    if (!data) {
                        $(this).attr("disabled", "enabled");
                    } else {
                        $(this).attr("disabled", "enabled");
                        $('#composemessage').modal('hide');
                    }
                });
            });

            // Test call to render the friends in the sidebar
            apiCall(DBapiKey, '/' + data.xuid + '/friends', settings.cache.friends, function(data){
                var friends = data;
                // Remove loading element
                $('.friendlist').html('');
                // Create list for Xuids of all friends
                var xuidList = [];
                // Add button for each friend
                $(friends).each(function(k,v) {
                    // Push Xuid into xuidList
                    xuidList.push(v.id);
                    // Append in "friendlist" container
                    $('.friendlist').append('\
<li>\
    <button class="pseudobutton open-composemessage" data-xuid="' + v.id + '" data-gamertag="' + v.GameDisplayName + '">\
        <span class="sidebar-avatar">\
            <img src="http://avatar.xboxlive.com/avatar/' + encodeURIComponent(v.GameDisplayName) + '/avatarpic-l.png"> \
        </span>\
        <span class="bubble" data-xuid="' + v.id + '"></span>\
        ' + v.GameDisplayName + '\
    </button>\
</li>');
                });

                // Prepare presence data
                var presenceObject = {};
                presenceObject.users = xuidList;

                // Update connectivity indicators initially and every settings.cache.presence seconds
                updateConnectivityIndicator(DBapiKey, presenceObject, settings.cache.presence);
                setInterval(function(){
                    updateConnectivityIndicator(DBapiKey, presenceObject, settings.cache.presence);
                },settings.cache.presence * 1000);

                // Add click() function to open #composemessage modal
                $('.open-composemessage').click(function(e) {
                    recipientsList = [];
                    recipientObject = {};

                    recipientObject.gamertag = $(this).data('gamertag');
                    recipientObject.xuid = $(this).data('xuid');

                    recipientsList.push(recipientObject);

                    renderModal(recipientsList);
                });
            });

            // Test call to render messages
            apiCall(DBapiKey, '/messages', settings.cache.messages, function(data){
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

