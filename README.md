Live.app
========

Live.app is a client side JavaScript web app to message your Xbox Live friends. It uses the great RESTful [XboxAPI.com](https://xboxapi.com/) to communicate with Xbox Live. PouchDB is used as IndexDB/WebSQL storage to cache and deliver the actual informations more quickly and also to reduce the actual API calls to XboxAPI. You can adjust the caching per endpoint in the `settings.json` configuration file if needed.

The project is a work in progress!

### Screenshots

Main page

![](http://up.frd.mn/yMVqV.png)

Mobile view

![](http://up.frd.mn/DS40B.png)

![](http://up.frd.mn/YGywR.png)

### Requirements

* Installed `npm` and `grunt`: `npm install -g grunt-cli` 
* API key for [XboxAPI](https://xboxapi.com/documentation)

### Installation

1. Clone the repository: `git clone https://github.com/frdmn/Live.app`
2. Install all dependencies: `npm install`
3. Install web libraries: `bower install`
4. Run grunt task: `grunt`
5. Adjust settings: `cp settings-sample.json settings.json`
6. Thats it. Open `index.html`!

### settings.json

    {
        "cache":{
            "friends":100,
            "messages":100
        }
    }

### Dependencies

* NodeJS (`npm`)
* Bower
* Grunt

## Version

0.0.3

## License

[WTFPL](LICENSE)
