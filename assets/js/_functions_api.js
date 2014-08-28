/*  Function to check API key */

var checkApiKey = function(input, callback) {
    var apiKey = input;
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader('X-AUTH', apiKey);
        }
    });

    // Send request to check API key and also store the Xuid on success 
    $.get('https://xboxapi.com/v2/accountXuid', function (data) {
        log.debug('[DEBUG] Authentication with API key "' + apiKey + '" successful');
        callback(data);
    // Return false
    }).fail(function() {
        log.error('[ERROR] Couldn\'t authenticate. API key invalid or API down?');
        callback(false);
    });
};

/* Retrieve direct API data function */
    
var retrieveApiData = function(apiKey, endpoint, callback) {
    // Prepare ajax request
    $.ajaxSetup({
        beforeSend: function(xhr) {
            // Add X-AUTH header
            xhr.setRequestHeader('X-AUTH', apiKey);
        }
    });

    log.info('[INFO] API call "GET ' + endpoint + '" started');

    // Fire GET
    $.get('https://xboxapi.com/v2'+endpoint, function (data) {
        log.info('[INFO] API call "GET ' + endpoint + '" finished');
        callback(data);
    // In case of any error, return false
    }).fail(function() {
        log.error('[ERROR] Couldn\'t finish API call "GET ' + endpoint + '". API down?');
        callback(false);
    });
};

/* Retrieve DB data function */

var retrieveDbData = function (endpoint, callback) {
    // PouchDB init
    var pouchdb = new PouchDB(endpoint);
    // Try to get()
    pouchdb.get('jsonData', function(err, doc) {
        // In case of error, return false
        if (err) {
            if (err.status != 404) {
                log.error('[ERROR] Error while retrieving from DB: ', err);
            }
            callback(false);
        }
        // If no error, send data to callback
        if (doc) {
            callback(doc);
        }
    });
};

/* Sumbit API data function */

var submitApiData = function (apikey, endpoint, content, callback) {
    log.info('[INFO] API call "POST ' + endpoint + '" started');

    // Prepare ajax request
    $.ajaxSetup({
        beforeSend: function(xhr) {
            // Add X-AUTH header
            xhr.setRequestHeader('X-AUTH', apikey);
            // Add Content-Type header
            xhr.setRequestHeader('Content-Type', 'application/json');
        }
    });

    // Fire POST
    $.post('https://xboxapi.com/v2'+endpoint, JSON.stringify(content), function (data) {
        log.info('[INFO] API call "POST ' + endpoint + '" successfully finished');
        callback(data);
    // In case of any error, return false
    }).fail(function() {
        log.error('[ERROR] Couldn\'t finish API call "POST ' + endpoint + '"');
        callback(false);
    });
};

/* Submit DB data function */

var submitDbData = function (input, endpoint, callback) {
    // PouchDB init    
    var pouchdb = new PouchDB(endpoint);

    // Check for existing data
    pouchdb.get('jsonData', function(err, otherDoc) {
        // If no exisiting data, put() without revision
        // Otherwise put() with revision of outdated data
        if (!otherDoc) {
            // Try to put() the input object into PouchDB
            pouchdb.put(input, 'jsonData', function(err, response) {
                // In case of errors, return false
                if (err) {
                    log.error('[ERROR] Couldn\'t transfer "' + endpoint + '" into database', err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    log.info('[INFO] API call "' + endpoint + '" finished');
                    callback(response);
                }
            });
        } else {
            // Try to put() the input object into PouchDB
            pouchdb.put(input, 'jsonData', otherDoc._rev, function(err, response) {
                // In case of errors, return false
                if (err) {
                    log.error("[ERROR] Couldn't transfer settings into database", err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    log.info('[INFO] "' + endpoint + '" successfully stored in PouchDB');
                    callback(response);
                }
            });
        }
    });
};

/* Function to send message */

var sendMessage = function(apikey, recipients, message, callback){
    var jsonObject = {};

    jsonObject.to = recipients;
    jsonObject.message = message;

    submitApiData(apikey, '/messages', jsonObject, function(data){
        if (!data) {
            log.error("[ERROR] Couldn't send message - ", recipients, message);
            callback(false);
        } else {
            log.info("[INFO] Message successfully sent!", recipients, message);
            callback(true);
        }
    });
};

/* API call function */

var apiCall = function (apiKey, endpoint, cache, callback) {
    // Show loading spinner
    showLoadingSpinner();

    // Try to get the cached API results out of PouchDB
    retrieveDbData(endpoint, function(data){
        timestampNow = $.now();
        var dataExpiredCondition = (timestampNow - data.timestamp) / 1000,
            dataExpired = (dataExpiredCondition >= cache);

        log.debug('[DEBUG] Check if cache is expired for endpoint "' + endpoint + '"');

        // If no result or caching value exceeded => call API directly
        // Otherwise return cached API results out of PouchDB
        if (!data || dataExpired) {
            // Display caching status of cachable objects in PouchDB
            if (data && dataExpired) {
                log.info('[INFO] Cache expired for "' + endpoint + ': ' + dataExpiredCondition + ' ms > ' + cache);
            }

            // Execute retrieve function
            retrieveApiData(apiKey, endpoint, function(data) {
                // In case of server side API error, return false
                // Otherwise proceed to transfer the API results into local database
                if (!data) {
                    // Hide loading spinner again
                    hideLoadingSpinner();                          
                    callback(false);
                } else {
                    // Create new object to append a timestamp
                    var jsonObject = {};
                    jsonObject.timestamp  = timestampNow;
                    jsonObject.jsonData = data;

                    // Try to submit the data into the DB
                    submitDbData(jsonObject, endpoint, function(submitData){
                        // Return false in case of error
                        // Otherwise, send to callback 
                        if (!submitData) {
                            // Hide loading spinner again
                            hideLoadingSpinner();                          
                            callback(false);
                        } else {
                            // Hide loading spinner again
                            hideLoadingSpinner();                          
                            callback(data);
                        }
                    });
                }
            });
        } else {
            log.debug('[DEBUG] Cache not expired for "' + endpoint + '". Deliver cached version from PouchDB.');
            log.info('[INFO] DB call "' + endpoint + '" started');
            // Retrieve cached data
            retrieveDbData(endpoint, function(data){
                log.info('[INFO] DB call "' + endpoint + '" finished');
                // Hide loading spinner again
                hideLoadingSpinner();                          
                // Send callback
                callback(data.jsonData);
            });
        }
    });
};

/* API POST call function */

var apiPostCall = function (apiKey, endpoint, postdata, cache, callback) {
    // Show loading spinner
    if(endpoint != 'presence') { showLoadingSpinner(); } 

    // Try to get the cached API results out of PouchDB
    retrieveDbData(endpoint, function(data){
        timestampNow = $.now();
        var dataExpiredCondition = (timestampNow - data.timestamp) / 1000,
            dataExpired = (dataExpiredCondition >= cache);

        log.debug('[DEBUG] Check if cache is expired for endpoint "' + endpoint + '"');

        // If no result or caching value exceeded => call API directly
        // Otherwise return cached API results out of PouchDB
        if (!data || dataExpired) {
            // Display caching status of cachable objects in PouchDB
            if (data && dataExpired) {
                log.info('[INFO] Cache expired for "' + endpoint + ': ' + dataExpiredCondition + ' ms > ' + cache);
            }

            // Execute submit function
            submitApiData(apiKey, endpoint, postdata, function(data) {
                // In case of server side API error, return false
                // Otherwise proceed to transfer the API results into local database
                if (!data) {
                    // Hide loading spinner again
                    if(endpoint != 'presence') { hideLoadingSpinner(); } 
                    callback(false);
                } else {
                    // Create new object to append a timestamp
                    var jsonObject = {};
                    jsonObject.timestamp  = timestampNow;
                    jsonObject.jsonData = data;

                    // Try to submit the data into the DB
                    submitDbData(jsonObject, endpoint, function(submitData){
                        // Return false in case of error
                        // Otherwise, send to callback 
                        if (!submitData) {
                            // Hide loading spinner again
                            hideLoadingSpinner();                          
                            callback(false);
                        } else {
                            // Hide loading spinner again
                            hideLoadingSpinner();                          
                            callback(data);
                        }
                    });
                }
            });
        } else {
            log.debug('[DEBUG] Cache not expired for "' + endpoint + '". Deliver cached version from PouchDB.');
            log.info('[INFO] DB call "' + endpoint + '" started');
            // Retrieve cached data
            retrieveDbData(endpoint, function(data){
                log.info('[INFO] DB call "' + endpoint + '" finished');
                // Hide loading spinner again
                hideLoadingSpinner();                          
                // Send callback
                callback(data.jsonData);
            });
        }
    });
};

/* Get connectivity status */

function updateConnectivityIndicator(apiKey, presenceObject, cache){
    // Call presence endpoint to render connectivity status of friends
    apiPostCall(apiKey, '/presence', presenceObject, cache, function(data){
        $(data).each(function(k,v){
            $('.bubble[data-xuid="' + v.xuid + '"]').removeClass().addClass('bubble bubble--' + v.state.toLowerCase());
        });
    });
}