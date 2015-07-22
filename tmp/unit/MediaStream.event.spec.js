//mocha.bail();
//mocha.run();

var expect = chai.expect;
var assert = chai.assert;
var should = chai.should;

// Test timeouts
var testTimeout = 35000;

// Get User Media timeout
var gUMTimeout = 25000;

// Test item timeout
var testItemTimeout = 4000;


describe('MediaStream | EventHandler', function() {
	this.timeout(testTimeout + 2000);
	this.slow(2000);

	/* Attributes */
	var stream = null;
	var track = null;

	/* WebRTC Object should be initialized in Safari/IE Plugin */
	before(function (done) {
		this.timeout(testItemTimeout);

		if (window.webrtcDetectedBrowser !== 'IE' && window.webrtcDetectedBrowser !== 'Safari') {
			AdapterJS.onwebrtcreadyDone = true;
		}

		if (!AdapterJS.onwebrtcreadyDone) {
			AdapterJS.onwebrtcready = function () {
				done();
			};

		} else {
			done();
		}
	});

	/* Get User Media */
	beforeEach(function (done) {
		this.timeout(gUMTimeout);

		window.navigator.getUserMedia({
			audio: true,
			video: true

		}, function (data) {

			stream = data;
			track = data.getAudioTracks()[0];
			done();

		}, function (error) {
			throw error;
		});
	});

	it('MediaStream.onremovetrack :: emit', function (done) {
		this.timeout(testItemTimeout);

		stream.onremovetrack = function () {
		  done();
		};

		stream.removeTrack(track);
	});

	it('MediaStream.onaddtrack :: emit', function (done) {
		this.timeout(testItemTimeout);

		stream.onaddtrack = function () {
		  done();
		};

		stream.addTrack(track);
	});

	it('MediaStream.onended :: emit < When > MediaStream.stop()', function (done) {
		this.timeout(testItemTimeout);

		stream.onended = function () {
		  done();
		};

		stream.stop();
	});

	it('MediaStream.onended :: emit < When > for MediaStreamTrack in MediaStream >> MediaStreamTrack.stop()', function (done) {
		this.timeout(testItemTimeout);

		stream.onended = function () {
		  done();
		};

		var i, j;

		var audioTracks = stream.getAudioTracks();
		var videoTracks = stream.getVideoTracks();

		for (i = 0; i < audioTracks.length; i += 1) {
			audioTracks[i].stop();
		}

		for (j = 0; j < videoTracks.length; j += 1) {
			videoTracks[j].stop();
		}
	});
});