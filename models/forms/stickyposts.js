'use strict';

module.exports = (posts) => {

	const filteredposts = posts.filter(post => {
		return !post.thread && !post.sticky
	})

	if (filteredposts.length === 0) {
		return {
			message: 'No thread(s) to sticky',
		};
	}

	return {
		message: `Stickied ${filteredposts.length} thread(s)`,
		action: '$set',
		query: {
			'sticky': true,
			'bumped': 8640000000000000
		}
	};

}
