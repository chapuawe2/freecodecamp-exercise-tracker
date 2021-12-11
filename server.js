const express = require('express');
const app = express();

const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const cors = require('cors');
require('dotenv').config();

mongoose.connect(process.env.MONGOURI);

const userSchema = new mongoose.Schema({
  username: String
}), User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
}), Exercise = mongoose.model('Exercise', exerciseSchema);

const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [Object]
}), Log = mongoose.model('Log', logSchema);

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
/*
app.use('/', (req, res, next)=>{
  console.log(req.method, req.originalUrl);
  next();
})
*/
app.get('/api/users', (req, res)=>{
  User.find((err, data)=>{
    if (err) return res.json(err);

    res.json(data);
  })
})

app.post('/api/users', bodyParser.urlencoded({
  extended: false
}), (req, res)=>{
  const username = req.body.username;
  
  User.findOne({username: username}, (err, data)=>{
    if (err) return res.json(err);

    if (data){
      res.json(data);
    } else {
      const user = new User({username: username});
      user.save((err, data)=>{
        if (err) return res.json(err);

        res.json({
          username: data.username,
          _id: data._id
        });
      })

      const log = new Log({
        username: username,
        count: 0,
        log: []
      })

      log.save();
    }
  })
});

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({
  extended: false
}), (req, res)=>{
  const id = req.params["_id"];

  User.findById(id, (err, data)=>{
    if (err) return res.json(err);

    if (data){
      const {
        description, duration, date
      } = req.body;

      const user = data;
      const dateFormatted = 
      date ? new Date(date) : new Date();

      if (dateFormatted == "Invalid Date") {
        return res.json({
          error: dateFormatted
        });
      }

      const exercise = new Exercise({
        username: user.username,
        description: description,
        duration: duration,
        date: dateFormatted
      })

      exercise.save((err, data)=>{
        if (err) res.json(err);

        const response = {
          username: user.username,
          description: data.description,
          duration: data.duration,
          date: data.date.toDateString(),
          _id: user._id
        }

        res.json(response);
      })

      Log.find({
        username: user.username
      }).exec((err, data)=>{
        if (err) return;

        const document = data[0];

        document.count++;
        document.log.push({
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date.toDateString()
        });

        document.save((err, data)=>{
          if (err) return console.log(err);
        })
      });

    } else {
      res.json({
        error: "User not found"
      })
    }
  })
})

app.get('/api/users/:_id/logs', (req, res)=>{
  const id = req.params._id;

  User.findById(id, (err, data)=>{
    if (err) return res.json(err);

    if (data){
      const username = data.username;

      Log.find({
        username: username
      }, (err, data)=>{
        if (err) return res.json(err)

        let logs = data[0].log;

        if (req.query.from){
          let fromDate = new Date(req.query.from);
          fromDate = fromDate.getTime();

          logs = logs.filter(ex=>{
            let date = new Date(ex.date);
            date = date.getTime();

            return date >= fromDate;
          })
        }

        if (req.query.to){
          let toDate = new Date(req.query.to);
          toDate = toDate.getTime();

          logs = logs.filter(ex=>{
            let date = new Date(ex.date);
            date = date.getTime();

            return date <= toDate;
          })
        }

        if (req.query.limit){
          const limit = req.query.limit;
          logs = logs.slice(0, limit);
        }

        const response = {
          username: username,
          count: logs.length,
          _id: data[0]._id,
          log: logs
        }

        res.json(response);
        
        console.log(req.originalUrl);
        console.log(response);
      });
    } else {
      res.json({
        error: "User not found"
      });
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
