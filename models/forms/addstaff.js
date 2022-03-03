'use strict';

const { Boards, Accounts } = require(__dirname+'/../../db/')
	, dynamicResponse = require(__dirname+'/../../helpers/dynamic.js')
	, { roles } = require(__dirname+'/../../helpers/roles.js');

module.exports = async (req, res, next) => {

	await Promise.all([
		Accounts.addStaffBoard([req.body.username], res.locals.board._id),
		Boards.addStaff(res.locals.board._id, req.body.username, roles.BOARD_STAFF)
	]);

	return dynamicResponse(req, res, 200, 'message', {
		'title': 'Success',
		'message': 'Added staff',
		'redirect': `/${req.params.board}/manage/staff.html`,
	});

}
