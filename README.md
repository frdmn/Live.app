Live.app
========

JavaScript based web app to chat with your Xbox Live friends.

Work in progress!

### Screenshots

(These are just mockups at the moment, since this project is WIP!)

Main page

![](http://up.frd.mn/0CD09.png)

Mobile view

![](http://up.frd.mn/vw1mL.png)

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

0.0.1

## License

[WTFPL](LICENSE)
