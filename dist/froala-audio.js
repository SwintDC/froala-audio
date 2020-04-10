"use strict";

var FroalaEditor = _interopRequireWildcard(require("froala-editor"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj["default"] = obj; return newObj; } }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function capitalize(str) {
  return "".concat(str.charAt(0).toUpperCase()).concat(str.slice(1).toLowerCase());
}

(function ($, FE) {
  'use strict';

  Object.assign(FE.POPUP_TEMPLATES, {
    'audio.insert': '[_BUTTONS_][_BY_URL_LAYER_][_UPLOAD_LAYER_][_PROGRESS_BAR_]',
    'audio.edit': '[_BUTTONS_]'
  });
  Object.assign(FE.DEFAULTS, {
    audioAllowedTypes: ['mp3', 'mpeg', 'x-m4a'],
    audioEditButtons: ['audioReplace', 'audioRemove', '|', 'audioAutoplay', 'audioAlign'],
    audioInsertButtons: ['audioBack', '|', 'audioByURL', 'audioUpload'],
    audioMove: true,
    audioSplitHTML: false,
    audioUpload: true,
    audioUploadMethod: 'POST',
    audioUploadParam: 'file',
    audioUploadParams: {},
    audioUploadURL: 'https://i.froala.com/upload'
  });

  FE.PLUGINS.audio = function (editor) {
    var _errorMessages;

    var MISSING_LINK = 1;
    var ERROR_DURING_UPLOAD = 2;
    var BAD_RESPONSE = 4;
    var BAD_FILE_TYPE = 8;
    var errorMessages = (_errorMessages = {}, _defineProperty(_errorMessages, MISSING_LINK, 'No link in upload response.'), _defineProperty(_errorMessages, ERROR_DURING_UPLOAD, 'Error during file upload.'), _defineProperty(_errorMessages, BAD_RESPONSE, 'Parsing response failed.'), _defineProperty(_errorMessages, BAD_FILE_TYPE, 'Unsupported file type - please provide an audio file.'), _errorMessages);
    var currentAudio = null;

    var stopEditing = function stopEditing(audio) {
      if (!audio) audio = editor.$el.find('.fr-audio');
      if (!audio.length) return;
      editor.toolbar.enable();
      audio.removeClass('fr-active');
      currentAudio = null;
    };

    var bindInsertEvents = function bindInsertEvents(popup) {
      // Drag over the droppable area.
      editor.events.$on(popup, 'dragover dragenter', '.fr-audio-upload-layer', function () {
        this.classList.add('fr-drop');
        return false;
      }, true); // Drag end.

      editor.events.$on(popup, 'dragleave dragend', '.fr-audio-upload-layer', function () {
        this.classList.remove('fr-drop');
        return false;
      }, true); // Drop.

      editor.events.$on(popup, 'drop', '.fr-audio-upload-layer', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('fr-drop');
        var dt = e.originalEvent.dataTransfer;

        if (dt && dt.files) {
          var inst = popup.data('instance') || editor;
          inst.events.disableBlur();
          inst.audio.upload(dt.files);
          inst.events.enableBlur();
        }
      }, true);

      if (editor.helpers.isIOS()) {
        editor.events.$on(popup, 'touchstart', '.fr-audio-upload-layer input[type="file"]', function () {
          this.click();
        }, true);
      }

      editor.events.$on(popup, 'change', '.fr-audio-upload-layer input[type="file"]', function () {
        if (this.files) {
          var inst = popup.data('instance') || editor;
          inst.events.disableBlur();
          popup.find('input:focus').blur();
          inst.events.enableBlur();
          inst.audio.upload(this.files);
        } // Else IE 9 case.
        // Chrome fix.


        this.value = '';
      }, true);
    };

    var refreshInsertPopup = function refreshInsertPopup() {
      var popup = editor.popups.get('audio.insert');
      var inputs = popup.find('input, button');
      inputs.removeAttr('disabled').val('').trigger('change');
    };
    /* eslint-disable camelcase */


    var initInsertPopup = function initInsertPopup() {
      editor.popups.onRefresh('audio.insert', refreshInsertPopup);
      editor.popups.onHide('audio.insert', editor.audio.hideProgressBar);
      var buttonSpec = editor.opts.audioInsertButtons;
      if (!editor.opts.audioUpload) buttonSpec = buttonSpec.filter(function (x) {
        return x !== 'audioUpload';
      });
      var buttons = buttonSpec.length < 2 ? '' : "<div class=\"fr-buttons\">\n                ".concat(editor.button.buildList(buttonSpec), "\n            </div>");
      var by_url_layer = "<div class=\"fr-audio-by-url-layer fr-layer\" id=\"fr-audio-by-url-layer-".concat(editor.id, "\">\n                <div class=\"fr-input-line\">\n                    <input id=\"fr-audio-by-url-layer-text-").concat(editor.id, "\" type=\"text\" placeholder=\"").concat(editor.language.translate('Paste in an audio URL'), "\" tabIndex=\"1\" aria-required=\"true\" />\n                </div>\n                <div class=\"fr-action-buttons\">\n                    <button type=\"button\" class=\"fr-command fr-submit\" data-cmd=\"audioInsertByURL\" tabIndex=\"2\" role=\"button\">").concat(editor.language.translate('Insert'), "</button>\n                </div>\n            </div>");
      var accept = editor.opts.audioAllowedTypes.map(function (t) {
        return 'audio/' + t;
      }).join(',');
      var upload_layer = "<div class=\"fr-audio-upload-layer fr-file-upload-layer fr-layer\" id=\"fr-audio-upload-layer-".concat(editor.id, "\">\n                <strong>").concat(editor.language.translate('Drop audio'), "</strong><br />(").concat(editor.language.translate('or click'), ")\n                <div class=\"fr-form\">\n                    <input type=\"file\" accept=\"").concat(accept, "\" tabIndex=\"-1\" aria-labelledby=\"fr-audio-upload-layer-").concat(editor.id, "\" role=\"button\" />\n                </div>\n            </div>");
      var progress_bar = "<div class=\"fr-audio-progress-bar-layer fr-layer\">\n                <h3 tabIndex=\"-1\" class=\"fr-message\">".concat(editor.language.translate('Uploading'), "</h3>\n                <div class=\"fr-loader\">\n                    <span class=\"fr-progress\"></span>\n                </div>\n                <div class=\"fr-action-buttons\">\n                    <button type=\"button\" class=\"fr-command fr-dismiss\" data-cmd=\"audioDismissError\" tabIndex=\"2\" role=\"button\">\n                        ").concat(editor.language.translate('OK'), "\n                    </button>\n                </div>\n            </div>");
      var popup = editor.popups.create('audio.insert', {
        buttons: buttons,
        by_url_layer: by_url_layer,
        upload_layer: upload_layer,
        progress_bar: progress_bar
      });
      bindInsertEvents(popup);
      return popup;
    };

    var initEditPopup = function initEditPopup() {
      var buttonSpec = editor.opts.audioEditButtons;
      var buttons = buttonSpec.length < 1 ? '' : "<div class=\"fr-buttons\">\n                ".concat(editor.button.buildList(buttonSpec), "\n            </div>");
      return editor.popups.create('audio.edit', {
        buttons: buttons
      });
    };
    /* eslint-enable camelcase */


    var showProgressBar = function showProgressBar(message) {
      var popup = editor.popups.get('audio.insert') || initInsertPopup();
      popup.find('.fr-layer.fr-active').removeClass('fr-active').addClass('fr-pactive');
      popup.find('.fr-audio-progress-bar-layer').addClass('fr-active');
      popup.find('.fr-buttons').hide();
      if (message) showProgressMessage(message, 0);
    };

    var showErrorMessage = function showErrorMessage(message) {
      showProgressBar();
      var popup = editor.popups.get('audio.insert');
      var layer = popup.find('.fr-audio-progress-bar-layer');
      layer.addClass('fr-error');
      var messageHeader = layer.find('h3');
      messageHeader.text(editor.language.translate(message));
      editor.events.disableBlur();
      messageHeader.focus();
    };

    var throwError = function throwError(code, response) {
      editor.edit.on();
      showErrorMessage(errorMessages[code]);
      editor.events.trigger('audio.error', [{
        code: code,
        message: errorMessages[code]
      }, response]);
    };

    var showProgressMessage = function showProgressMessage(message, progress) {
      var popup = editor.popups.get('audio.insert');
      if (!popup) return;
      var layer = popup.find('.fr-audio-progress-bar-layer');
      layer.find('h3').text(editor.language.translate(message) + (progress ? ' ' + progress + '%' : ''));
      layer.removeClass('fr-error');

      if (progress) {
        layer.find('div').removeClass('fr-indeterminate');
        layer.find('div > span').css('width', progress + '%');
      } else {
        layer.find('div').addClass('fr-indeterminate');
      }
    };

    var parseResponse = function parseResponse(response) {
      if (editor.events.trigger('audio.uploaded', [response], true) === false) {
        editor.edit.on();
        return false;
      }

      var res = JSON.parse(response);
      if (res.link) return res;
      throwError(MISSING_LINK, response);
      return false;
    };

    var addNewAudio = function addNewAudio(src, response) {
      var data = parseResponse(response) || {};
      var $audio = $('<span contenteditable="false" draggable="true" class="fr-audio fr-uploading">' + '<audio controls="controls" controlsList="nodownload"></audio>' + '</span>');
      $audio.toggleClass('fr-draggable', editor.opts.audioMove);
      editor.events.focus(true);
      editor.selection.restore();
      editor.undo.saveStep();

      if (editor.opts.audioSplitHTML) {
        editor.markers.split();
      } else {
        editor.markers.insert();
      }

      editor.html.wrap();
      var $marker = editor.$el.find('.fr-marker'); // Do not insert audio inside emoticon.

      if (editor.node.isLastSibling($marker) && $marker.parent().hasClass('fr-deletable')) {
        $marker.insertAfter($marker.parent());
      }

      $marker.replaceWith($audio);
      editor.selection.clear();
      var player = $audio.find('audio');
      player.text(editor.language.translate('Your browser does not support HTML5 audio.')).on('canplaythrough loadeddata', function () {
        editor.popups.hide('audio.insert');
        $audio.removeClass('fr-uploading');
        editor.events.trigger('audio.loaded', [$audio]);
      }).on('error', function (e) {
        editor.popups.hide('audio.insert');
        $audio.addClass('fr-error').removeClass('fr-uploading');
        editor.events.trigger('audio.error', [$audio, e]);
      }).attr(Object.entries(data).reduce(function (acc, _ref) {
        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            value = _ref2[1];

        return _objectSpread({}, acc, _defineProperty({}, 'data-' + key.toLowerCase(), value));
      }, {})).attr({
        src: src
      });
      return $audio;
    };

    var replaceAudio = function replaceAudio(audio, src) {
      var player = audio.find('audio'); // If you try to replace it with itself, we clear the src first so that the events still fire.

      if (player.attr('src') === src) player.attr({
        src: ''
      });
      audio.addClass('fr-uploading');
      player.off('canplaythrough loadeddata').off('error').on('canplaythrough loadeddata', function () {
        editor.popups.hide('audio.insert');
        audio.removeClass('fr-uploading');
        editor.events.trigger('audio.loaded', [audio]);
        stopEditing(audio);
      }).on('error', function (e) {
        audio.addClass('fr-error').removeClass('fr-uploading');
        editor.audio.showEditPopup(audio);
        editor.events.trigger('audio.error', [audio, e]);
      }).attr({
        src: src
      });
      return audio;
    };

    var insertHtmlAudio = function insertHtmlAudio(link, response) {
      editor.edit.on();
      showProgressMessage('Loading audio');
      showProgressBar('Loading audio');
      var replace = !!currentAudio;
      var $audio = replace ? replaceAudio(currentAudio, link) : addNewAudio(link, response);
      editor.undo.saveStep();
      editor.events.trigger(replace ? 'audio.replaced' : 'audio.inserted', [$audio, response]);
    };

    var touchScroll = false;

    var editAudio = function editAudio(e) {
      var $audio = $(this);

      if (touchScroll && e && e.type === 'touchend') {
        return true;
      }

      if (editor.edit.isDisabled()) {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }

        return false;
      }

      editor.toolbar.disable(); // Hide keyboard.

      if (editor.helpers.isMobile()) {
        editor.events.disableBlur();
        editor.$el.blur();
        editor.events.enableBlur();
      }

      if (currentAudio) currentAudio.removeClass('fr-active');
      currentAudio = $audio;
      $audio.addClass('fr-active');
      if (editor.opts.iframe) editor.size.syncIframe();
      editor.audio.showEditPopup($audio);
      editor.selection.clear();
      var range = editor.doc.createRange();
      range.selectNode($audio[0]);
      editor.selection.get().addRange(range);
      editor.button.bulkRefresh();
      return true;
    };

    return {
      _init: function _init() {
        if (editor.helpers.isMobile()) {
          editor.events.$on(editor.$el, 'touchstart', 'span.fr-audio', function () {
            touchScroll = false;
          });
          editor.events.$on(editor.$el, 'touchmove', function () {
            touchScroll = true;
          });
        }

        editor.events.$on(editor.$el, 'mousedown', 'span.fr-audio', function (e) {
          e.stopPropagation();
        });
        editor.events.$on(editor.$el, 'click touchend', 'span.fr-audio', editAudio);
        editor.events.on('mouseup window.mouseup', function () {
          return stopEditing();
        });
        editor.events.on('commands.mousedown', function ($btn) {
          if ($btn.parents('.fr-toolbar').length) stopEditing();
        });
      },
      showInsertPopup: function showInsertPopup() {
        if (!editor.popups.get('audio.insert')) initInsertPopup(); // Find the first button and show its associated layer.

        editor.opts.audioInsertButtons.some(function (b) {
          if (b === 'audioByURL') {
            editor.audio.showLayer('audio-by-url');
            return true;
          }

          if (b === 'audioUpload') {
            editor.audio.showLayer('audio-upload');
            return true;
          }

          return false;
        });
      },
      showEditPopup: function showEditPopup($audio) {
        var $popup = 'audio.edit';
        if (!editor.popups.get($popup)) initEditPopup();
        editor.popups.setContainer($popup, editor.$sc);
        editor.popups.refresh($popup);
        var $player = $audio.find('audio');

        var _$player$offset = $player.offset(),
            left = _$player$offset.left,
            top = _$player$offset.top;

        var height = $player.outerHeight();
        editor.popups.show($popup, left + $player.outerWidth() / 2, top + height, height);
      },
      refreshByURLButton: function refreshByURLButton(btn) {
        var popup = editor.popups.get('audio.insert');

        if (popup.find('.fr-audio-by-url-layer').hasClass('fr-active')) {
          btn.addClass('fr-active').attr('aria-pressed', true);
        }
      },
      refreshUploadButton: function refreshUploadButton(btn) {
        var popup = editor.popups.get('audio.insert');

        if (popup.find('.fr-audio-upload-layer').hasClass('fr-active')) {
          btn.addClass('fr-active').attr('aria-pressed', true);
        }
      },
      autoplay: function autoplay() {
        if (!currentAudio) return false;
        var player = currentAudio.find('audio');
        var isAuto = player.attr('autoplay');

        if (!!isAuto) {
          player.removeAttr('autoplay');
        } else {
          player.attr('autoplay', true);
        }
      },
      align: function align(val) {
        if (!currentAudio) return false; // Center is the default, so just clear the alignment if that's what was requested.

        if (val === 'center') val = '';
        currentAudio.css({
          textAlign: val
        }); // Changing the alignment will almost certainly move the actual audio player away from the edit popup,
        // so we re-display the popup to get them back in sync.

        editor.audio.showEditPopup(currentAudio);
      },
      refreshAutoplayButton: function refreshAutoplayButton($btn) {
        if (!currentAudio) return false;
        var isAuto = currentAudio.find('audio').attr('autoplay');
        $btn.toggleClass('fr-active', isAuto).attr('aria-pressed', isAuto);
      },
      refreshAlignButton: function refreshAlignButton(btn) {
        if (!currentAudio) return false;
        var align = currentAudio.css('textAlign') || 'center';
        var btnChildren = btn.children();

        if (btnChildren.length > 0) {
          var wrapper = document.createElement('div');
          wrapper.innerHTML = editor.icon.create('audioAlign' + capitalize(align));
          btnChildren[0].replaceWith(wrapper.firstChild);
        }
      },
      refreshAlignDropdown: function refreshAlignDropdown($btn, $dropdown) {
        if (!currentAudio) return;
        var align = currentAudio.css('textAlign') || 'center';
        $dropdown.find(".fr-command[data-param1=\"".concat(align, "\"]")).addClass('fr-active').attr('aria-selected', true);
      },
      back: function back() {
        if (currentAudio) {
          editor.audio.showEditPopup(currentAudio);
        } else {
          editor.events.disableBlur();
          editor.selection.restore();
          editor.events.enableBlur();
          editor.popups.hide('audio.insert');
          editor.toolbar.showInline();
        }
      },
      refreshBackButton: function refreshBackButton(btn) {
        var showBack = currentAudio || editor.opts.toolbarInline;
        btn.toggleClass('fr-hidden', !showBack);
        btn.next('.fr-separator').toggleClass('fr-hidden', !showBack);
      },
      showLayer: function showLayer(name) {
        var popup = editor.popups.get('audio.insert');
        editor.popups.setContainer('audio.insert', currentAudio ? editor.$sc : editor.$tb);
        var left,
            top,
            height = 0;

        if (currentAudio) {
          var $player = currentAudio.find('audio');
          height = $player.outerHeight();
          var offset = $player.offset();
          left = offset.left + $player.width() / 2;
          top = offset.top + height;
        } else if (editor.opts.toolbarInline) {
          // Set top to the popup top.
          top = popup.offset().top - editor.helpers.getPX(popup.css('margin-top')); // If the popup is above apply height correction.

          if (popup.hasClass('fr-above')) top += popup.outerHeight();
        } else {
          var $btn = editor.$tb.find('.fr-command[data-cmd="insertAudio"]');

          var _offset = $btn.offset();

          left = _offset.left + $btn.outerWidth() / 2;
          top = _offset.top + (editor.opts.toolbarBottom ? 10 : $btn.outerHeight() - 10);
        } // Show the new layer.


        popup.find('.fr-layer').removeClass('fr-active');
        popup.find('.fr-' + name + '-layer').addClass('fr-active');
        editor.popups.show('audio.insert', left, top, height);
        editor.accessibility.focusPopup(popup);
        editor.popups.refresh('audio.insert');
      },
      hideProgressBar: function hideProgressBar(dismiss) {
        var popup = editor.popups.get('audio.insert');
        if (!popup) return;
        popup.find('.fr-layer.fr-pactive').addClass('fr-active').removeClass('fr-pactive');
        popup.find('.fr-audio-progress-bar-layer').removeClass('fr-active');
        popup.find('.fr-buttons').show(); // Dismiss error message.

        var audios = editor.$el.find('audio.fr-error');

        if (dismiss || audios.length) {
          editor.events.focus();

          if (audios.length) {
            audios.parent().remove();
            editor.undo.saveStep();
            editor.undo.run();
            editor.undo.dropRedo();
          }

          editor.popups.hide('audio.insert');
        }
      },
      insertByURL: function insertByURL(link) {
        if (!link) {
          var popup = editor.popups.get('audio.insert');
          link = (popup.find('.fr-audio-by-url-layer input[type="text"]').val() || '').trim();
          popup.find('input, button').attr('disabled', true);
        }

        if (!/^http/.test(link)) link = 'https://' + link;
        insertHtmlAudio(link);
      },
      upload: function upload(audios) {
        // Make sure we have what to upload.
        if (!(audios && audios.length)) return false; // Check if we should cancel the upload.

        if (editor.events.trigger('audio.beforeUpload', [audios]) === false) return false;
        var audio = audios[0];

        if (!editor.opts.audioAllowedTypes || !editor.opts.audioAllowedTypes.includes(audio.type.replace(/audio\//g, ''))) {
          throwError(BAD_FILE_TYPE);
          return false;
        }

        if (!editor.drag_support.formdata) return false;
        var formData = new FormData();

        if (!!editor.opts.audioUploadParams) {
          Object.entries(editor.opts.audioUploadParams).forEach(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2),
                key = _ref4[0],
                value = _ref4[1];

            return formData.append(key, value);
          });
        }

        formData.append(editor.opts.audioUploadParam, audio);
        var url = editor.opts.audioUploadURL;
        var xhr = editor.core.getXHR(url, editor.opts.audioUploadMethod); // Set upload events.

        xhr.onload = function () {
          showProgressMessage('Loading audio');
          var status = this.status,
              response = this.response,
              responseText = this.responseText;

          if (status === 415) {
            throwError(BAD_FILE_TYPE, JSON.parse(responseText));
            return;
          }

          if (status < 200 || status >= 300) {
            throwError(ERROR_DURING_UPLOAD, response || responseText);
            return;
          }

          try {
            var resp = parseResponse(response);
            if (resp) insertHtmlAudio(resp.link, responseText);
          } catch (ex) {
            // Bad response.
            throwError(BAD_RESPONSE, response || responseText);
          }
        };

        xhr.onerror = function () {
          throwError(BAD_RESPONSE, this.response || this.responseText || this.responseXML);
        };

        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) showProgressMessage('Uploading', e.loaded / e.total * 100 | 0);
        };

        xhr.onabort = function () {
          editor.edit.on();
          editor.audio.hideProgressBar(true);
        };

        showProgressBar();
        editor.events.disableBlur();
        editor.edit.off();
        editor.events.enableBlur();
        var popup = editor.popups.get('audio.insert');

        if (popup) {
          popup.off('abortUpload');
          popup.on('abortUpload', function () {
            if (xhr.readyState !== 4) xhr.abort();
          });
        } // Send data.


        xhr.send(formData);
        return true;
      },
      replace: function replace() {
        if (!currentAudio) return;
        editor.audio.showInsertPopup();
      },
      remove: function remove() {
        if (!currentAudio) return;
        var audio = currentAudio;
        if (editor.events.trigger('audio.beforeRemove', [audio]) === false) return;
        editor.popups.hideAll();
        var el = audio[0];
        editor.selection.setBefore(el) || editor.selection.setAfter(el);
        audio.remove();
        editor.selection.restore();
        editor.html.fillEmptyBlocks();
        editor.events.trigger('audio.removed', [audio]);
        stopEditing(audio);
      }
    };
  };

  FE.DefineIcon('insertAudio', {
    NAME: 'volume-up',
    template: 'font_awesome'
  });
  FE.RegisterCommand('insertAudio', {
    title: 'Insert Audio',
    undo: false,
    focus: true,
    refreshAfterCallback: false,
    popup: true,
    callback: function callback() {
      if (!this.popups.isVisible('audio.insert')) return this.audio.showInsertPopup();

      if (this.$el.find('.fr-marker').length) {
        this.events.disableBlur();
        this.selection.restore();
      }

      return this.popups.hide('audio.insert');
    },
    plugin: 'audio'
  });
  FE.DefineIcon('audioByURL', {
    NAME: 'link',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioByURL', {
    title: 'By URL',
    undo: false,
    focus: false,
    toggle: true,
    callback: function callback() {
      this.audio.showLayer('audio-by-url');
    },
    refresh: function refresh($btn) {
      this.audio.refreshByURLButton($btn);
    }
  });
  FE.DefineIcon('audioUpload', {
    NAME: 'upload',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioUpload', {
    title: 'Upload Audio',
    undo: false,
    focus: false,
    toggle: true,
    callback: function callback() {
      this.audio.showLayer('audio-upload');
    },
    refresh: function refresh($btn) {
      this.audio.refreshUploadButton($btn);
    }
  });
  FE.RegisterCommand('audioDismissError', {
    title: 'OK',
    undo: false,
    callback: function callback() {
      this.audio.hideProgressBar(true);
    }
  });
  FE.RegisterCommand('audioInsertByURL', {
    undo: true,
    focus: true,
    callback: function callback() {
      this.audio.insertByURL();
    }
  });
  FE.DefineIcon('audioAlignLeft', {
    NAME: 'align-left',
    template: 'font_awesome'
  });
  FE.DefineIcon('audioAlignRight', {
    NAME: 'align-right',
    template: 'font_awesome'
  }); // For consistency with the video plugin, we use the align-justify icon for alignCenter. :(

  FE.DefineIcon('audioAlignCenter', {
    NAME: 'align-justify',
    template: 'font_awesome'
  });
  FE.DefineIcon('audioAlign', {
    NAME: 'align-center',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioAlign', {
    type: 'dropdown',
    title: 'Align',
    options: {
      left: 'Align Left',
      center: 'None',
      right: 'Align Right'
    },
    html: function html() {
      var _this = this;

      var mkOption = function mkOption(_ref5) {
        var _ref6 = _slicedToArray(_ref5, 2),
            val = _ref6[0],
            label = _ref6[1];

        return "<li role=\"presentation\">\n                <a class=\"fr-command fr-title\" tabIndex=\"-1\" role=\"option\" data-cmd=\"audioAlign\"\n                   data-param1=\"".concat(val, "\" title=\"").concat(_this.language.translate(label), "\">\n                    ").concat(_this.icon.create('audioAlign' + capitalize(val)), "\n                    <span class=\"fr-sr-only\">").concat(_this.language.translate(label), "</span>\n                </a>\n            </li>");
      };

      return "<ul class=\"fr-dropdown-list\" role=\"presentation\">\n                ".concat(Object.entries(FE.COMMANDS.audioAlign.options).map(mkOption).join('\n'), "\n            </ul>");
    },
    callback: function callback(cmd, val) {
      this.audio.align(val);
    },
    refresh: function refresh($btn) {
      this.audio.refreshAlignButton($btn);
    },
    refreshOnShow: function refreshOnShow($btn, $dropdown) {
      this.audio.refreshAlignDropdown($btn, $dropdown);
    }
  });
  FE.DefineIcon('audioAutoplay', {
    NAME: 'play-circle',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioAutoplay', {
    title: 'Autoplay',
    toggle: true,
    callback: function callback() {
      this.audio.autoplay();
    },
    refresh: function refresh($btn) {
      this.audio.refreshAutoplayButton($btn);
    }
  });
  FE.DefineIcon('audioReplace', {
    NAME: 'exchange',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioReplace', {
    title: 'Replace',
    undo: false,
    focus: false,
    popup: true,
    refreshAfterCallback: false,
    callback: function callback() {
      this.audio.replace();
    }
  });
  FE.DefineIcon('audioRemove', {
    NAME: 'trash',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioRemove', {
    title: 'Remove',
    callback: function callback() {
      this.audio.remove();
    }
  });
  FE.DefineIcon('audioBack', {
    NAME: 'arrow-left',
    template: 'font_awesome'
  });
  FE.RegisterCommand('audioBack', {
    title: 'Back',
    undo: false,
    focus: false,
    back: true,
    callback: function callback() {
      this.audio.back();
    },
    refresh: function refresh($btn) {
      this.audio.refreshBackButton($btn);
    }
  });
  if (!FE.RegisterQuickInsertButton) return;
  FE.RegisterQuickInsertButton('audio', {
    icon: 'insertAudio',
    requiredPlugin: 'audio',
    title: 'Insert Audio',
    undo: false,
    callback: function callback() {
      var src = prompt(this.language.translate('Paste the URL of the audio you want to insert.'));
      if (src) this.audio.insertByURL(src);
    }
  });
})(window.jQuery, FroalaEditor);