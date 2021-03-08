const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html')
});

// Connecting to mongoose
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})

// Add middleware to use url-encoded
app.use(express.urlencoded({ extended: true }));

const { Schema } = mongoose;

// Sub-model for exercise
const exerciseSchema = new Schema({
	description: { type: String, required: true },
	duration: { type: Number, require: true },
	date: Date
})

const exercise = mongoose.model('exercise', exerciseSchema);

// Model to store user
const userSchema = new Schema({
	username: { type: String, require: true },
	log: [exerciseSchema]
});

const user = mongoose.model('user', userSchema);


// API to add new user
app.post('/api/exercise/new-user', (req, res) => {
	const { username } = req.body;

	// Finding if username is taken
	user.findOne({ username }, (err, data) => {
		if (err) res.send(err);
		else if (data) res.send('Username is already taken');
		else create_user(username, res);
	})
})

function create_user(username, res) {
	const new_user = new user({
		username
	});
	new_user.save((err, data) => {
		if (err) res.send(err);
		else res.send({
			_id: data._id,
			username: data.username
		});
	})
}


// API to get all users
app.get('/api/exercise/users', (req, res) => {
	user.find({}, (err, data) => {
		if (err) console.error(err);
		else res.json(data.map(user => ({
			_id: user.id,
			username: user.username
		})));
	});
});


// API to add exercise
app.post('/api/exercise/add', (req, res) => {
	let { userId, description, duration, date } = req.body;

	// Configuring date
	if (date == '') date = new Date().toDateString();
	const new_exercise = new exercise({ description, duration, date });

	// Adding exercise to database
	new_exercise.validate(err => {
		if (err) res.send('Exercise cannot be validated, try again.');
		else {
			user.findByIdAndUpdate(userId, {
				$push: { log: new_exercise }
			}, {
				new: true
			}, (err, updated_data) => {
				if (err) {
					res.send("Something went wrong here, try again.");
					console.error(err);
				} else res.json({
					_id: userId,
					username: updated_data.username, date, duration, description
				});
			})
		}
	})
})


// API to log all the exercise, by given userId, to, from, limit
app.get('/api/exercise/log', (req, res) => {
	let { userId, to, from, limit } = req.query;

	user.findOne({ _id: userId }, (err, data) => {
		if (err) {
			res.send('Something went wrong, try again.')
		} else {
			let { log } = data;

			if (to) {
				const to_date = new Date(to);
				log = log.filter(item => item.date <= to_date);
			}

			if (from) {
				const from_date = new Date(from);
				log = log.filter(item => item.date >= from_date)
			}

			log = log.sort((a, b) => b.date - a.date);

			if (limit)
				log = log.slice(0, parseInt(limit));

			res.json({
				_id: userId, username: data.username, log
			})
		}
	})
})