var express = require('express');
var router = express.Router();
var ourTeamRouter = require('express').Router();
var mentorRouter = require('express').Router();
var indexController = require('./controllers/index');
router.get('/', indexController);

ourTeamRouter.get('/', (req, res) =>{
    res.render('home/views/ourTeam');
});

mentorRouter.get('/', (req, res) =>{
    res.render('home/views/mentor');
});
exports.index = router;
exports.team = ourTeamRouter;
exports.mentor = mentorRouter;