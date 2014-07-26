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

    /* Load settings (synchronously) */

    var settingsFile = '../../settings.json';
    var settings = [];
    $.ajax({
        type: 'GET',
        url: settingsFile,
        dataType: 'json',
        success: function(data) { settings = data;},
        async: false
    });

    console.log('API key: ' + settings.apiKey);

    /* Function to check for settings DB */

    var getSettings = function (cb) {
        var pouchdb = new PouchDB('settings');
        pouchdb.get('settings', function(err, doc) {
            if (err) {console.log(err);}
            if (!doc) { 
                $.bootstrapGrowl('No API key found. Please enter in the settings modal.', { type: 'info' });
                cb(false);
            } else {
                cb(doc);
            }
        });
    };

    /* Function to save settings in DB */
    
    var setSettings = function () {
        var apiKey = $('.modal input').val();

        var saveSetting = function() {
            // PouchDB init
            var pouchdb = new PouchDB('settings');

            var settingsData = {};
            settingsData.apiKey = apiKey;

            // Get existing results
            pouchdb.get('settings', function(err, otherDoc) {
                // If no exisiting results, put without revision
                if (!otherDoc) {
                    pouchdb.put({
                        settings: settingsData,
                        timestamp: $.now()
                    }, 'settings');
                // Otherwise put with revision of outdated results
                } else {
                    pouchdb.put({
                        settings: settingsData,
                        timestamp: $.now()
                    }, 'settings', otherDoc._rev);
                }
            });
        };
       
        // Function to check API key
        var checkApiKey = function(cb) {
            $.ajaxSetup({
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-AUTH', apiKey);
                }
            });

            // Send request to check API key and also store the Xuid on success 
            $.get('https://xboxapi.com/v2/accountXuid', function (data) {
                cb(data);
            // Return false
            }).fail(function() {
                cb(false);
            });
        };

        // Execute API check function
        checkApiKey(function(data){
            // If no data in callback available => enable inputs again
            if (!data) {
                $.bootstrapGrowl('API key seems invalid. Please check!', { type: 'danger' });
                $('.submit-button').attr("disabled", false);
                $(".modal input").prop('disabled', false);
            // Data in callback => save in PouchDB and reload page 
            } else {
                // Execute function to save settings
                saveSetting(function (){
                    $.bootstrapGrowl('Valic API key! Successfully saved', { type: 'success' });
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                });
            }
        });
    };

    /* API call function */

    var apiCall = function (endpoint, cache, callback) {
        // PouchDB init
        var pouchdb = new PouchDB(endpoint),
            pouchrows;

        // Try to get the cached API results out of PouchDB
        pouchdb.get('apiData', function(err, response) {
            timestampNow = $.now();

            // If no result or caching value exceeded => call API directly
            if (!response || ((timestampNow - response.timestamp) / 1000 >= cache)) {
                console.log('[INFO] API call "' + endpoint + '" started');
                retrieveApiData(function(data) {
                    // Get existing results
                    pouchdb.get('apiData', function(err, otherDoc) {
                        // If no exisiting results, put without revision
                        if (!otherDoc) {
                            pouchdb.put({
                                apiData: data,
                                timestamp: $.now()
                            }, 'apiData');
                        // Otherwise put with revision of outdated results
                        } else {
                            pouchdb.put({
                                apiData: data,
                                timestamp: $.now()
                            }, 'apiData', otherDoc._rev);
                        }
                    });

                    // Send callback
                    callback(data);

                    console.log('[INFO] API call "' + endpoint + '" finished');
                });
            // Otherwise return cached API results out of PouchDB
            } else {
                console.log('[INFO] DB call "' + endpoint + '" started');
                retrieveDbData(function(data){
                    // Send callback
                    callback(data);
                    console.log('[INFO] DB call "' + endpoint + '" finished');
                });
            }
        });

        /* Retrieve direct API data function */
        
        var retrieveApiData = function(cb) {
            $.ajaxSetup({
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-AUTH', settings.apiKey);
                }
            });

            $.get('https://xboxapi.com/v2'+endpoint, function (data) {
                cb(data);
                $.bootstrapGrowl('API call successful :)', { type: 'success' });
            }).fail(function() {
                // Send notification
                $.bootstrapGrowl('Couldn\'t connect to API :(', { type: 'danger' });
            });
        };

        /* Retrieve DB data function */

        var retrieveDbData = function (cb) {
            pouchdb.get('apiData', function(err, doc) {
                if (err) {console.log(err);}
                cb(doc.apiData);
            });
        };
    };

    // Check for existing settings in PouchDB

    getSettings(function(data){
        if (!data) {
            $(".modal").addClass("modal--open");

            $('.submit-button').click(function (){
                $(this).attr("disabled", true);
                $(".modal input").prop('disabled', true);
                setSettings();
            });
        } else {
            // Test call to render the friends in the sidebar
            apiCall('/' + settings.xuid + '/friends', settings.cache.friends, function(data){
                var friends = data;
                // Remove loading element
                $('.friendlist').html('');
                // Add button for each friend
                $(friends).each(function(k,v) {
                    $('.friendlist').append('\
<li>\
    <button class="pseudobutton open-modal">\
        <div class="bubble"></div> \
        ' + v.GameDisplayName + '\
    </button>\
</li>');
                });
            });

            // Test call to render messages
            apiCall('/messages', settings.cache.messages, function(data){
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
  <div class="timeline-badge"><img src="http://placekitten.com/100/100"></div>\
  <div class="timeline-panel">\
    <div class="timeline-heading">\
      <h4 class="timeline-title"><div class="bubble bubble--online"></div> ' + v.header.sender + '</h4>\
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

