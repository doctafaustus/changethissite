// Modules
var express = require('express');
var bodyParser = require('body-parser');
var http = require("http");
var url = require("url");
var mongoose = require('mongoose');
var uriUtil = require('mongodb-uri');
var request = require('request');

/* DATABASE */
var Schema = mongoose.Schema; // allows use to define our schema
var ObjectId = Schema.ObjectId;

// Connect to MongoDB
if (!process.env.PORT) {
	mongoose.connect('mongodb://localhost/site');
} else {
	console.log("Application running in Heroku");
	var mongodbUri = process.env.MONGOLAB_URI; // A Heroku config variable
	var mongooseUri = uriUtil.formatMongoose(mongodbUri);
	mongoose.connect(mongooseUri, { 
									server: { 
										socketOptions: { 
											keepAlive: 1, 
											connectTimeoutMS: 30000 
										}
									}, 
									replset: { 
										socketOptions: { 
											keepAlive: 1, 
											connectTimeoutMS : 30000
										} 
									} 
								});
}
// Contact is a mongoose model (meaning it represents a user in the database). Then specify a schema, which is how the data is going to be represented in the db. List the fields and what type of value they are. The id is the value that MongoDB provides us.
var Site = mongoose.model('Site', new Schema({
	id: ObjectId,
	site: String,
	creationDate: {type: Date, default: Date.now}
}));


// Stripe
// Test CC: 4242424242424242
var stripePrivateKey = process.env.PK || "sk_test_M6Kl75IVrABORGexEGZjt740";
var stripe = require("stripe")(stripePrivateKey);


// Globals
var port = process.env.PORT || 3000;


// Initiate Express
var app = express();
app.set('view engine', 'ejs');
app.locals.pretty = true;
app.use(express.static('public'));
//app.use(favicon(__dirname + '/public/bypass/favicon.ico'));
app.listen(port, function(req, res) {
	console.log('App listening on port 3000');
});


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', function(req, res) {
	Site.findOne({}, {}, { sort: { 'creationDate' : -1 } }, function(err, record) {
		console.log(record)
		res.render('index.ejs', record);
	});
});

app.get('/history', function(req, res) {
	Site.find().sort({ 'creationDate' : -1 }).limit(15).exec(function(err, records) {
		if (err) throw err;
		res.json(records);
	});
});


app.post('/test', function(req, eResponse) {
	var site = req.body.site.toLowerCase();
	console.log(site);

	request({ url: site, followRedirect: false }, function (err, res, body) {
		// If URL is invalid then return immediately
		if (res === undefined) {
			console.log("Not valid!");
	  		eResponse.sendStatus(404);
			return;
		}

	  	console.log(res.headers.location);

	  	if (res.headers.location !== undefined) {
	  		site = res.headers.location; // Set the site to the final redirected site
	  	}

	  	console.log("Final site: " + site);

	  	// The http module cannot work with https (we can't use https sites in an iframe anyway). So if the final/redirected site contains https we have to check for it and return an error message
	  	if (!isUrlValid(site)) {
	  		console.log("NOT VALID");
	  		eResponse.sendStatus(404);
	  		return;
	  	}


		http.get(site, function(response) {
			//console.log(response)
			console.log(response.headers["x-frame-options"]);
			if (response.headers["x-frame-options"]) {
				console.log("Not allowed!");
		  		eResponse.sendStatus(404);
		  		return;
			} else {
				console.log("Good to go!");
				eResponse.sendStatus(200);
			}
			//response.resume();
		}).on('error', function(e) {
			console.log("Error - invalid url");
		});
	});

	function isUrlValid(url) {
	    return /^(http?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
	}
});


// Test CC: 4242424242424242
app.post('/charge', function(req, res) {
	// Get the credit card details submitted by the form
	var stripeToken = req.body.stripeToken;
	var site = req.body.site;

	console.log("Submitted Site: " + site);

	var charge = stripe.charges.create({
		amount: 500, // amount in cents, again
		currency: "usd",
		source: stripeToken,
		description: "Site change purchase",
		metadata: {
			site: req.body.site,
		}
	}, function(err, charge) {
		if (err && err.type === 'StripeCardError') {
			console.log('Payment Declined');
			// Send error message
			res.render('decline.ejs');
		} else {

			console.log('Payment Succeeded');
			var newSite = new Site({
				site: site
			});
			newSite.save(function(err, record) {
				if (err) throw err;
				console.log(record);
				res.send(200);
			});

		}
	});
});

app.get('/confirm', function(req, res) {
	res.render('confirm.ejs');
});
