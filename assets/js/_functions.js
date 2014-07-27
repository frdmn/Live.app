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
        callback(data);
    // Return false
    }).fail(function() {
        callback(false);
    });
};

/* API call function */

var apiCall = function (apiKey, endpoint, cache, callback) {
    // Try to get the cached API results out of PouchDB
    retrieveDbData(endpoint, function(data){
        timestampNow = $.now();
        var dataExpiredCondition = (timestampNow - data.timestamp) / 1000,
            dataExpired = (dataExpiredCondition >= cache);

        // If no result or caching value exceeded => call API directly
        // Otherwise return cached API results out of PouchDB
        if (!data || dataExpired) {
            // Display caching status of cachable objects in PouchDB
            if (data && dataExpired) {
                console.log('[INFO] Cache expired for "' + endpoint + ': ' + dataExpiredCondition + ' ms > ' + cache);
            }

            console.log('[INFO] API call "' + endpoint + '" started');

            // Execute retrieve function
            retrieveApiData(apiKey, endpoint, function(data) {
                // In case of server side API error, return false
                // Otherwise proceed to transfer the API results into local database
                if (!data) {
                    console.log('[WARN] Couldn\'t finish API call "' + endpoint + '"!');
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
                            callback(false);
                        } else {
                            callback(data);
                            console.log('[INFO] API call "' + endpoint + '" finished');                               
                        }
                    });
                }
            });
        } else {
            console.log('[INFO] DB call "' + endpoint + '" started');
            // Retrieve cached data
            retrieveDbData(endpoint, function(data){
                // Send callback
                callback(data.jsonData);
                console.log('[INFO] DB call "' + endpoint + '" finished');
            });
        }
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

    // Fire GET
    $.get('https://xboxapi.com/v2'+endpoint, function (data) {
        callback(data);
    // In case of any error, return false
    }).fail(function() {
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
                console.log(err);
            }
            callback(false);
        }
        // If no error, send data to callback
        if (doc) {
            callback(doc);
        }
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
                    console.log(err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    callback(response);
                }
            });
        } else {
            // Try to put() the input object into PouchDB
            pouchdb.put(input, 'jsonData', otherDoc._rev, function(err, response) {
                // In case of errors, return false
                if (err) {
                    console.log(err);
                    callback(false);
                }
                // If no errors, send response to callback
                if (response){
                    callback(response);
                }
            });
        }
    });
};

/* Function to open modal */ 

var renderModal = function(recipients, messagebody){
    console.log(recipients, messagebody);
    $('.modal#composemessage input#recipients').val(recipients);

    if (messagebody) {
        $('.modal#composemessage textarea#messagebody').html(messagebody);
    }
    
    $('.modal#composemessage').modal('show');
    return true;
};