const modalClasses = ['modal', 'modal-bg'];
function removeModal() {
	modalClasses.forEach(c => document.getElementsByClassName(c)[0].remove());
}

function doModal(data, postcallback) {
	const modalHtml = modal({ modal: data });
	let checkInterval;
	document.body.insertAdjacentHTML('afterbegin', modalHtml);
	document.getElementById('modalclose').onclick = () => {
		removeModal();
		clearInterval(checkInterval);
	};
	document.getElementsByClassName('modal-bg')[0].onclick = () => {
		removeModal();
		clearInterval(checkInterval);
	};
	const modalframe = document.getElementById('modalframe');
	if (modalframe && postcallback) {
		checkInterval = setInterval(() => {
			if (modalframe && modalframe.contentDocument.title == 'Success') {
				clearInterval(checkInterval);
				removeModal();
				postcallback();
			}
		}, 100);
	}
}

const checkTypes = ['checkbox', 'radio'];
function isCheckBox(element) {
	return checkTypes.includes(element.type)
}

function formToJSON(form) {
	const data = {};
	for (element of form.elements) {
		if (element.name /*&& element.value*/ && (!isCheckBox(element) || element.checked)) {
			if (isCheckBox(element) && data[element.name]) {
				if (Array.isArray(data[element.name])) {
					data[element.name] = data[element.name].push(element.value);
				} else {
					data[element.name] = [data[element.name], element.value];
				}
			} else {
				data[element.name] = element.value;
			}
		}
	}
	return JSON.stringify(data);
}

class formHandler {

	constructor(form) {
		this.form = form;
		this.enctype = this.form.getAttribute('enctype');
		this.messageBox = form.querySelector('#message')
		this.submit = form.querySelector('input[type="submit"]')
		this.originalSubmitText = this.submit.value;
		this.fileInput = form.querySelector('input[type="file"]');
		this.captcha = this.form.querySelector('img');
		this.minimal = this.form.elements.minimal;
		this.files = [];
		if (this.fileInput) {
			this.fileRequired = this.fileInput.required;
			this.fileLabel = this.fileInput.previousSibling;
			this.multipleFiles = this.fileLabel.parentNode.previousSibling.firstChild.textContent.endsWith('s');
			this.fileLabelText = this.fileLabel.childNodes[0];
			this.fileLabel.addEventListener('dragover', e => this.fileLabelDrag(e));
			this.fileLabel.addEventListener('drop', e => this.fileLabelDrop(e));
			this.fileInput.addEventListener('change', e => this.fileInputChange(e));
			this.fileLabel.addEventListener('auxclick', e => this.fileLabelAuxclick(e));
		}
		form.addEventListener('paste', e => this.paste(e));
		form.addEventListener('submit', e => this.formSubmit(e));
	}

	reset() {
		this.form.reset();
		if (this.form.elements.postpassword) {
			this.form.elements.postpassword.value = localStorage.getItem('postpassword');
		}
		this.updateMessageBox();
		this.files = [];
		this.updateFilesText();
		if (this.captcha) {
			this.captcha.dispatchEvent(new Event('dblclick'));
		}
	}

	formSubmit(e) {
		const xhr = new XMLHttpRequest();
		let postData;
		if (this.enctype === 'multipart/form-data') {
			this.fileInput.disabled = true; //palemoon is dumb, so append them instead
			postData = new FormData(this.form);
			this.fileInput.disabled = false;
			if (this.files && this.files.length > 0) {
				//add files to file input element
				for (let i = 0; i < this.files.length; i++) {
					postData.append('file', this.files[i]);
				}
			}
		} else {
			postData = new URLSearchParams([...(new FormData(this.form))]);
		}
		if (this.banned || this.minimal) {
			return true;
		} else {
			e.preventDefault();
		}
		this.submit.disabled = true;
		if (this.files && this.files.length > 0) {
			//show progress on file uploads
			xhr.onloadstart = () => {
				this.submit.value = '0%';
			}
			xhr.upload.onprogress = (e) => {
				const progress = Math.floor((e.loaded / e.total) * 100);
				this.submit.value = `${progress}%`;
			}
			xhr.onload = () => {
				this.submit.value = this.originalSubmitText;
			}
		}
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				this.submit.disabled = false;
				let json;
				if (xhr.responseText) {
					try {
						json = JSON.parse(xhr.responseText);
console.log(json)
					} catch (e) {
						//wasnt json response
					}
				}
				if (xhr.status == 200) {
					if (!json) {
						if (xhr.responseURL
							&& xhr.responseURL !== `${location.origin}${this.form.getAttribute('action')}`) {
							window.location = xhr.responseURL;
							return;
						} else if (xhr.responseText) {
//todo: show success messages nicely for forms like actions (this doesnt apply to non file forms yet)
						}
					} else {
						if (json.message || json.messages || json.error || json.errors) {
							doModal(json);
						} else if (socket && socket.connected) {
							window.myPostId = json.postId;
							window.location.hash = json.postId
						} else {
							if (!isThread) {
								return window.location = json.redirect;
							}
							setLocalStorage('myPostId', json.postId);
							forceUpdate();
						}
					}
					this.reset();
				} else {
					if (xhr.status === 413) {
						this.clearFiles();
					}
					if (json) {
						doModal(json, () => {
							this.formSubmit(e);
						});
					} else {
//for bans, post form to show TODO: make modal support bans json and send dynamicresponse from it (but what about appeals, w/ captcha, etc?)
						this.clearFiles(); //dont resubmit files
						this.banned = true;
						this.form.dispatchEvent(new Event('submit'));
					}
				}
				this.submit.value = this.originalSubmitText;
			}
		}
		xhr.onerror = (e) => {
			console.error(e); //why is this error fucking useless
			doModal({
				'title': 'Error',
				'message': 'Something broke'
			});
			this.submit.disabled = false;
		}
		xhr.open(this.form.getAttribute('method'), this.form.getAttribute('action'), true);
		if (!this.minimal) {
			xhr.setRequestHeader('x-using-xhr', true);
		}
		const isLive = localStorage.getItem('live') == 'true' && socket && socket.connected;
		if (isLive) {
			xhr.setRequestHeader('x-using-live', true);
		}
		if (this.enctype !== 'multipart/form-data') {
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		}
		xhr.send(postData);
	}

	updateMessageBox() {
		this.messageBox && this.messageBox.dispatchEvent(new Event('input'));
	}

	//remove a single file, unused atm
	removeFile(index) {
		const childNode = this.fileLabel.childNodes[index+1]; //+1 because first one is fileLabelText
		childNode.remove();
		files.splice(index, 1);
	}

	addFile(file) {
		if (this.fileRequired) { //prevent drag+drop issues by removing required
			this.fileInput.removeAttribute('required');
		}
		this.files.push(file);
	}

	//show number of files on new label
	updateFilesText() {
		if (!this.fileLabelText) {
			return;
		}
		if (this.files && this.files.length === 0) {
			this.fileLabelText.nodeValue = `Select/Drop/Paste file${this.multipleFiles ? 's' : ''}`;
		} else {
			this.fileLabelText.nodeValue = `${this.files.length} file${this.files.length > 1 ? 's' : ''} selected`;
		}
	}

	//remove all files from this form
	clearFiles() {
		if (!this.fileInput) {
			return;
		}
		this.files = []; //empty file list
		this.fileInput.value = null; //remove the files for real
		if (this.fileRequired) { //reset to required if clearing files
			this.fileInput.setAttribute('required', true)
		}
		this.updateFilesText();
	}

	//paste file from clipboard
	paste(e) {
		const clipboard = e.clipboardData;
		if (clipboard.items && clipboard.items.length > 0) {
			const items = clipboard.items;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.kind === 'file') {
					const file = new File([item.getAsFile()], 'ClipboardImage.png', { type: item.type });
					this.addFile(file);
				}
			}
			this.updateFilesText();
		}
	}

	//change cursor on hover
	fileLabelDrag(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	}

	//add file on drag+drop
	fileLabelDrop(e) {
		e.stopPropagation();
		e.preventDefault();
		const newFiles = e.dataTransfer.files;
		for (let i = 0; i < newFiles.length; i++) {
			this.addFile(newFiles[i]);
		}
		this.updateFilesText();
	}

	//add file by normal file form, but add instead of replacing files
	fileInputChange(e) {
		const newFiles = this.fileInput.files;
		for (let i = 0; i < newFiles.length; i++) {
			this.addFile(newFiles[i]);
		}
		this.updateFilesText();
	}

	//middle click to clear files
	fileLabelAuxclick(e) {
		if (e.button !== 1) { //middle click only
			return;
		}
		this.clearFiles();
	}

}

window.addEventListener('DOMContentLoaded', () => {

	const myPostId = localStorage.getItem('myPostId');
	if (myPostId) {
		window.location.hash = myPostId;
		localStorage.removeItem('myPostId');
	}

	window.addEventListener('addPost', (e) => {
		if (e.detail.hover) {
			return; //dont need to handle hovered posts for this
		}
		if (window.myPostId == e.detail.postId) {
			window.location.hash = e.detail.postId;
		}
	});

});

window.addEventListener('settingsReady', () => {

	const forms = document.getElementsByTagName('form');
	for(let i = 0; i < forms.length; i++) {
		if (forms[i].method === 'post' /*&& forms[i].encoding === 'multipart/form-data'*/) {
			new formHandler(forms[i]);
		}
	}

})
