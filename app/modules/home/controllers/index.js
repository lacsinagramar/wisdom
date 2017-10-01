module.exports = (req, res) => {
    var hasSession;
    if(req.session && req.session.user) 
    {
        var sessionUser = req.session.user.strUsername;
        var userType = req.session.user.charUserType;
        hasSession=1;
        res.render('home/views/index', {hasSessionForPug: hasSession, sessionUserForPug: sessionUser, userTypeForPug: userType, reqQuery: req.query});
    }
    else 
    {
        hasSession=0;
        res.render('home/views/index', {hasSessionForPug: hasSession, reqQuery: req.query});
    }
}