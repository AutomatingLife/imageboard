const gm = require('gm').subClass({ imageMagick: true })
	, { Captchas } = require(__dirname+'/../../../db/')
	, { captchaOptions } = require(__dirname+'/../../../configs/main.js')
	, uploadDirectory = require(__dirname+'/../../files/uploadDirectory.js')
	, { promisify } = require('util')
	, randomBytes = promisify(require('crypto').randomBytes)
	, randomRange = async (min, max) => {
		if (max <= min) return min;
		const mod = max - min + 1;
		const div = (((0xffffffff - (mod-1)) / mod) | 0) + 1;
		let g
		do {
			g = (await randomBytes(4)).readUInt32LE();
		} while (g > div * mod - 1);
		return ((g / div) | 0) + min;
	}
	, padding = 30
	, width = captchaOptions.imageSize+padding
	, height = captchaOptions.imageSize+padding
	, gridSize = captchaOptions.gridSize
	, zeros = ['○','□','♘','♢','▽','△','♖','✧','♔','♘','♕','♗','♙','♧']
	, ones = ['●','■','♞','♦','▼','▲','♜','✦','♚','♞','♛','♝','♟','♣']
	, colors = ['#FF8080', '#80FF80', '#8080FF', '#FF80FF', '#FFFF80', '#80FFFF']

module.exports = async () => {
	//number of inputs in grid
	const numInputs = gridSize**2;
	//random buffer to get true/false for grid from
	const randBuffer = await randomBytes(numInputs);
	//array of true/false, for each grid input
	const boolArray = Array.from(randBuffer).map(x => x < 80);

	const captchaId = await Captchas.insertOne(boolArray).then(r => r.insertedId);

	const distorts = [];
	const numDistorts = await randomRange(captchaOptions.numDistorts.min,captchaOptions.numDistorts.max);
	const div = width/numDistorts;
	for (let i = 0; i < numDistorts; i++) {
		const divStart = (div*i)
			, divEnd = (div*(i+1));
		const originx = await randomRange(divStart, divEnd)
			, originy = await randomRange(0,height);
		const destx = await randomRange(Math.max(captchaOptions.distortion,originx-captchaOptions.distortion),Math.min(width-captchaOptions.distortion,originx+captchaOptions.distortion))
			, desty = await randomRange(Math.max(captchaOptions.distortion,originy-captchaOptions.distortion*2),Math.min(height-captchaOptions.distortion,originy+captchaOptions.distortion*2));
		distorts.push([
			{x:originx,y:originy},
			{x:destx,y:desty}
		]);
	}

	return new Promise(async(resolve, reject) => {
		const captcha = gm(width,height,'#ffffff')
		.fill('#000000')
		.font(__dirname+'/../font.ttf');

		const spaceSize = (width-padding)/gridSize;
		for(let j = 0; j < gridSize; j++) {
			let cxOffset = await randomRange(0, spaceSize*1.5);
			for(let i = 0; i < gridSize; i++) {
				const index = (j*gridSize)+i;
				const cyOffset = await randomRange(0, spaceSize/2);
				const charIndex = await randomRange(0, ones.length-1);
				const character = (boolArray[index] ? ones : zeros)[charIndex];
				captcha.fontSize((await randomRange(20,30)))
				captcha.drawText(
					spaceSize*(i)+cxOffset,
					spaceSize*(j+1)+cyOffset,
					character
				);
			}
		}

		captcha
		.distort(distorts, 'Shepards')
		.edge(25)
		.write(`${uploadDirectory}/captcha/${captchaId}.jpg`, (err) => {
			if (err) {
				return reject(err);
			}
			return resolve({ id: captchaId });
		});
	});

}
