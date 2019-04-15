'use strict';

module.exports = (req, res, next) => {

	//for body
	if (req.body.thread) {
		req.body.thread = +req.body.thread;
	}
	if (req.body.checkedposts) {
		//syntax tries to convert all string to number
		req.body.checkedposts = req.body.checkedposts.map(Number);
	}

	//and for params
	if (req.params.id) {
		req.params.id = +req.params.id;
	}
	if (req.params.page) {
		req.params.page = +req.params.page;
	}

	next();

}
