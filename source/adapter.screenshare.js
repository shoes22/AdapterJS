(function () {

  'use strict';

  var baseGetUserMedia = null;

  AdapterJS.TEXT.EXTENSION = {
    REQUIRE_INSTALLATION_FF: 'To enable screensharing you need to install the Skylink WebRTC tools Firefox Add-on.',
    REQUIRE_INSTALLATION_CHROME: 'To enable screensharing you need to install the Skylink WebRTC tools Chrome Extension.',
    REQUIRE_INSTALLATION_OPERA: 'To enable screensharing you need to install the Skylink WebRTC tools Opera Extension.',
    REQUIRE_REFRESH: 'Please refresh this page after the Skylink WebRTC tools extension has been installed.',
    BUTTON_FF: 'Go to Firefox Addons Directory',
    BUTTON_CHROME: 'Go to Chrome Web Store',
    BUTTON_OPERA: 'Go to Opera Addons Directory',
    CHROME_EXTENSION_ID: 'ljckddiekopnnjoeaiofddfhgnbdoafc',
    CHROME_EXTENSION_URL: 'https://chrome.google.com/webstore/detail/skylink-webrtc-tools/ljckddiekopnnjoeaiofddfhgnbdoafc',
    FIREFOX_EXTENSION_URL: 'https://addons.mozilla.org/en-US/firefox/addon/skylink-webrtc-tools/',
    OPERA_EXTENSION_ID: 'ljckddiekopnnjoeaiofddfhgnbdoafc-2',
    OPERA_EXTENSION_URL: 'https://opera.com/',
    DETECTRTC_URL: 'https://temasys-cdn.s3.amazonaws.com/skylink/extensions/detection-script-dev/detectRTC.html'
      //'https://cdn.temasys.com.sg/skylink/extensions/detectRTC.html'
  };

  var clone = function(obj) {
    if (null === obj || 'object' !== typeof obj) {
      return obj;
    }
    var copy = obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
  };

  if (window.navigator.mozGetUserMedia) {
    baseGetUserMedia = window.navigator.getUserMedia;

    navigator.getUserMedia = function (constraints, successCb, failureCb) {

      if (constraints && constraints.video && !!constraints.video.mediaSource) {
        // intercepting screensharing requests

        // Invalid mediaSource for firefox, only "screen" and "window" are supported
        if (constraints.video.mediaSource !== 'screen' && constraints.video.mediaSource !== 'window') {
          failureCb(new Error('GetUserMedia: Only "screen" and "window" are supported as mediaSource constraints'));
          return;
        }

        var updatedConstraints = clone(constraints);

        //constraints.video.mediaSource = constraints.video.mediaSource;
        updatedConstraints.video.mozMediaSource = updatedConstraints.video.mediaSource;

        // so generally, it requires for document.readyState to be completed before the getUserMedia could be invoked.
        // strange but this works anyway
        var checkIfReady = setInterval(function () {
          if (document.readyState === 'complete') {
            clearInterval(checkIfReady);

            baseGetUserMedia(updatedConstraints, successCb, function (error) {
              if (['PermissionDeniedError', 'SecurityError'].indexOf(error.name) > -1 && window.parent.location.protocol === 'https:') {
                AdapterJS.renderNotificationBar(AdapterJS.TEXT.EXTENSION.REQUIRE_INSTALLATION_FF,
                  AdapterJS.TEXT.EXTENSION.BUTTON_FF,
                  AdapterJS.TEXT.EXTENSION.FIREFOX_EXTENSION_URL, true, true);
              } else {
                failureCb(error);
              }
            });
          }
        }, 1);

      } else { // regular GetUserMediaRequest
        baseGetUserMedia(constraints, successCb, failureCb);
      }
    };

    AdapterJS.getUserMedia = window.getUserMedia = navigator.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return new Promise(function(resolve, reject) {
        window.getUserMedia(constraints, resolve, reject);
      });
    };

  } else if (window.navigator.webkitGetUserMedia) {
    var postFrameMessage = function () {}; // dummy

    // For chrome, use an iframe to load the screensharing extension
    // in the correct domain.
    // Modify here for custom screensharing extension in chrome
    // Opera 23 uses Chrome 35 which supports screensharing
    if ((window.webrtcDetectedBrowser === 'chrome' && window.webrtcDetectedVersion >= 34) ||
      (window.webrtcDetectedBrowser === 'opera' && window.webrtcDetectedVersion >= 23)) {
      var iframe = document.createElement('iframe');

      iframe.onload = function() {
        iframe.isLoaded = true;
      };

      iframe.src = AdapterJS.TEXT.EXTENSION.DETECTRTC_URL;
      iframe.style.display = 'none';

      (document.body || document.documentElement).appendChild(iframe);

      postFrameMessage = function (object) { // jshint ignore:line
        object = object || {};

        if (!iframe.isLoaded) {
          setTimeout(function () {
            iframe.contentWindow.postMessage(object, '*');
          }, 100);
          return;
        }

        iframe.contentWindow.postMessage(object, '*');
      };
    } else {
      console.warn('Your current browser does not support screensharing feature in getUserMedia');
    }

    baseGetUserMedia = window.navigator.getUserMedia;

    navigator.getUserMedia = function (constraints, successCb, failureCb) {
      if (constraints && constraints.video && !!constraints.video.mediaSource) {
        // would be fine since no methods
        var updatedConstraints = clone(constraints),
            extensionId = AdapterJS.TEXT.EXTENSION.CHROME_EXTENSION_ID,
            extensionUrl = AdapterJS.TEXT.EXTENSION.CHROME_EXTENSION_URL,
            extensionInstallText = AdapterJS.TEXT.EXTENSION.REQUIRE_INSTALLATION_CHROME,
            extensionInstallButtonText = AdapterJS.TEXT.EXTENSION.BUTTON_CHROME;

        if (window.webrtcDetectedBrowser === 'opera') {
          extensionId = AdapterJS.TEXT.EXTENSION.OPERA_EXTENSION_ID;
          extensionUrl = AdapterJS.TEXT.EXTENSION.OPERA_EXTENSION_URL;
          extensionInstallText = AdapterJS.TEXT.EXTENSION.REQUIRE_INSTALLATION_OPERA;
          extensionInstallButtonText = AdapterJS.TEXT.EXTENSION.BUTTON_OPERA;
        }

        var chromeCallback = function(error, sourceId) {
          if(!error) {
            updatedConstraints.video.mandatory = updatedConstraints.video.mandatory || {};
            updatedConstraints.video.mandatory.chromeMediaSource = 'desktop';
            updatedConstraints.video.mandatory.maxWidth = window.screen.width > 1920 ? window.screen.width : 1920;
            updatedConstraints.video.mandatory.maxHeight = window.screen.height > 1080 ? window.screen.height : 1080;

            if (sourceId) {
              updatedConstraints.video.mandatory.chromeMediaSourceId = sourceId;
            }

            delete updatedConstraints.video.mediaSource;

            baseGetUserMedia(updatedConstraints, successCb, failureCb);

          } else { // GUM failed
            if (error === 'permission-denied') {
              failureCb(new Error('Permission denied for screen retrieval'));
            } else {
              // NOTE(J-O): I don't think we ever pass in here. 
              // A failure to capture the screen does not lead here.
              failureCb(new Error('Failed retrieving selected screen'));
            }
          }
        };

        var onIFrameCallback = function (event) {
          if (!event.data) {
            return;
          }

          if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                chromeCallback('permission-denied');
            } else {
              chromeCallback(null, event.data.chromeMediaSourceId);
            }
          }

          if (event.data.chromeExtensionStatus) {
            if (event.data.chromeExtensionStatus === 'not-installed') {
              AdapterJS.renderNotificationBar(extensionInstallText, extensionInstallButtonText,
                extensionUrl, true, true);
            } else {
              chromeCallback(event.data.chromeExtensionStatus, null);
            }
          }

          // this event listener is no more needed
          window.removeEventListener('message', onIFrameCallback);
        };

        window.addEventListener('message', onIFrameCallback);

        postFrameMessage({
          captureSourceId: true,
          extensionId: extensionId
        });

      } else {
        baseGetUserMedia(constraints, successCb, failureCb);
      }
    };

    AdapterJS.getUserMedia = window.getUserMedia = navigator.getUserMedia;
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return new Promise(function(resolve, reject) {
        window.getUserMedia(constraints, resolve, reject);
      });
    };

  } else if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
    // nothing here because edge does not support screensharing
    console.warn('Edge does not support screensharing feature in getUserMedia');

  } else {
    baseGetUserMedia = window.navigator.getUserMedia;

    navigator.getUserMedia = function (constraints, successCb, failureCb) {
      if (constraints && constraints.video && !!constraints.video.mediaSource) {
        // would be fine since no methods
        var updatedConstraints = clone(constraints);

        // wait for plugin to be ready
        AdapterJS.WebRTCPlugin.callWhenPluginReady(function() {
          // check if screensharing feature is available
          if (!!AdapterJS.WebRTCPlugin.plugin.HasScreensharingFeature &&
            !!AdapterJS.WebRTCPlugin.plugin.isScreensharingAvailable) {
            // set the constraints
            updatedConstraints.video.optional = updatedConstraints.video.optional || [];
            updatedConstraints.video.optional.push({
              sourceId: AdapterJS.WebRTCPlugin.plugin.screensharingKey || 'Screensharing'
            });

            delete updatedConstraints.video.mediaSource;
          } else {
            failureCb(new Error('Your version of the WebRTC plugin does not support screensharing'));
            return;
          }
          baseGetUserMedia(updatedConstraints, successCb, failureCb);
        });
      } else {
        baseGetUserMedia(constraints, successCb, failureCb);
      }
    };

    AdapterJS.getUserMedia = getUserMedia = 
       window.getUserMedia = navigator.getUserMedia;
    if ( navigator.mediaDevices &&
      typeof Promise !== 'undefined') {
      navigator.mediaDevices.getUserMedia = requestUserMedia;
    }
  }
})();
