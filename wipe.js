
'use strict';

const Mongo = require(__dirname+'/db/db.js');

(async () => {
	console.log('connecting to db...')
	await Mongo.connect();
	const Boards = require(__dirname+'/db/boards.js')
		, Posts = require(__dirname+'/db/posts.js')
		, Bans = require(__dirname+'/db/bans.js')
		, Captchas = require(__dirname+'/db/captchas.js')
		, Accounts = require(__dirname+'/db/accounts.js');
	console.log('deleting captchas')
	await Captchas.deleteAll();
	console.log('deleting accounts')
	await Accounts.deleteAll();
	console.log('deleting posts')
	await Posts.deleteAll();
	console.log('deleting boards')
	await Boards.deleteAll();
	console.log('deleting bans');
	await Bans.deleteAll();
	console.log('adding boards')
	await Boards.insertOne({
		_id: 'file',
		owner: '',
		moderators: [],
		banners: [],
		sequence_value: 1,
		settings: {
			name: 'file',
			description: 'testing new file types',
			captcha: false,
			forceAnon: false,
			ids: false,
			userPostDelete: true,
			userPostSpoiler: true,
			userPostUnlink: true,
			threadLimit: 200,
			replyLimit: 500,
			maxFiles: 3,
			forceOPSubject: false,
			forceOPMessage: true,
			forceOPFile: true,
			minMessageLength: 0,
			defaultName: 'Anonymous',
		}
	})
	await Boards.insertOne({
		_id: 'pol',
		owner: '',
		moderators: [],
		banners: [],
		sequence_value: 1,
		settings: {
			name: 'politics',
			description: 'talk about politics',
			captcha: false,
			forceAnon: true,
			ids: true,
			userPostDelete: true,
			userPostSpoiler: true,
			userPostUnlink: true,
			threadLimit: 200,
			replyLimit: 500,
			maxFiles: 3,
			forceOPSubject: true,
			forceOPMessage: true,
			forceOPFile: true,
			minMessageLength: 0,
			defaultName: 'Anonymous',
		}
	})
	await Boards.insertOne({
		_id: 'b',
		owner: '',
		moderators: [],
		banners: [],
		sequence_value: 1,
		settings: {
			name: 'random',
			description: 'anything and everything',
			captcha: false,
			forceAnon: false,
			ids: false,
			userPostDelete: true,
			userPostSpoiler: true,
			userPostUnlink: true,
			threadLimit: 200,
			replyLimit: 500,
			maxFiles: 3,
			forceOPSubject: false,
			forceOPMessage: true,
			forceOPFile: true,
			minMessageLength: 0,
			defaultName: 'Anonymous',
		}
	})
	await Boards.insertOne({
		_id: 't',
		owner: '',
		moderators: [],
		banners: [],
		sequence_value: 1,
		settings: {
			name: 'test',
			description: 'testing board',
			captcha: false,
			forceAnon: true,
			ids: false,
			userPostDelete: true,
			userPostSpoiler: true,
			userPostUnlink: true,
			threadLimit: 200,
			replyLimit: 500,
			maxFiles: 0,
			forceOPSubject: false,
			forceOPMessage: true,
			forceOPFile: false,
			minMessageLength: 0,
			defaultName: 'Anonymous',
		}
	})
	console.log('creating indexes')
	await Bans.db.dropIndexes();
	await Bans.db.createIndex({ "expireAt": 1 }, { expireAfterSeconds: 0 });
	await Captchas.db.dropIndexes();
	await Captchas.db.createIndex({ "expireAt": 1 }, { expireAfterSeconds: 0 });
	await Posts.db.dropIndexes();
	//these are fucked
	await Posts.db.createIndex({
		'postId': 1,
		'board': 1,
	});
	await Posts.db.createIndex({
		'board': 1,
		'thread': 1,
		'bumped': -1
	});
	await Posts.db.createIndex({
		'board': 1,
		'reports.0': 1
	}, {
		partialFilterExpression: {
			'reports.0': {
				'$exists': true
			}
		}
	});
	await Posts.db.createIndex({
		'globalreports.0': 1
	}, {
		partialFilterExpression: {
			'globalreports.0': {
				'$exists': true
			}
		}
	});
	console.log('creating admin account: admin:changeme');
	await Accounts.insertOne('admin', 'changeme', 3);
	Mongo.client.close();
	console.log('done');
	process.exit(0);
})();
