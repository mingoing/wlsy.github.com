/**
 * Picasa like pizza delicious  
 *
 * @version 0.1.0
 * @author wlsy <i@wlsy.me>
 */

(function($, win) {

    /**
     * pizza
     */
    $.fn.pizza = function(opts) {

        var defaultOpts = {
            username: 'wlsy638',
            albumid: '5834489861667785793',
            picasaServer: 'picasaweb.google.com',
            papi: undefined
        };

        opts = $.extend(defaultOpts, opts || {});

        /**
         * 填充图片为最合适的大小  
         *
         * @param {Ojbec} thumbnail 图片宽度和高度
         * @return {Object} {width: xx; height: xxx}
         * @api private
         */

        function picFillSize(thumbnail) {
            if (!$.isPlainObject(thumbnail) && thumbnail.width && thumbnail.height) {
                return new Error("Invalid Param: picFillSize();");
            }

            // header&footer&photo meta height
            var leaveHeight = 150;
            var leaveWidth = 40;

            var viewHeight = $(win).height();
            var viewWitdh = $(win).width();
            var scale = thumbnail.width / thumbnail.height;

            var maxHeight = viewHeight - leaveHeight;
            var maxHeightToWidth = maxHeight * scale;

            // return final size
            var size = {};

            if (maxHeightToWidth > (viewWitdh - leaveWidth)) {
                size.width = viewWitdh - leaveWidth;
                size.height = size.width / scale;
            } else {
                size.width = maxHeight * scale;
                size.height = maxHeight;
            }
            return size;
        }

        /**
         * formatDate  
         */

        function formatDateTime($dt) {
            var $today = new Date(Number($dt));
            $year = $today.getUTCFullYear();
            if ($year < 1000) {
                $year += 1900;
            }
            if ($today == "Invalid Date") {
                return $dt;
            } else {
                if (($today.getUTCHours() === 0) && ($today.getUTCMinutes() === 0) && ($today.getUTCSeconds() === 0)) {
                    return ($today.getUTCDate() + "-" + ($today.getUTCMonth() + 1) + "-" + $year);
                } else {
                    return ($today.getUTCDate() + "-" + ($today.getUTCMonth() + 1) + "-" + $year + " " + $today.getUTCHours() + ":" + ($today.getUTCMinutes() < 10 ? "0" + $today.getUTCMinutes() : $today.getUTCMinutes()));
                }
            }
        }

        function getPicasa(config, next) {
            if (arguments.length === 1) {
                next = config;
            }

            config = $.extend({
                kind: 'photo',
                page: 0,
                maxResults: 10
            }, {});

            $.ajax({
                url: opts.papi || 'https://' + opts.picasaServer + '/data/feed/api/user/' + opts.username + '/albumid/' + opts.albumid + '?kind=' + config.kind + '&alt=json&start-index=' + (config.page * config.maxResults + 1) + '&max-results=' + config.maxResults,
                dataType: 'jsonp',
                success: function(data) {
                    next.call(null, data);
                }
            });
        }

        function resolveSrc(size, src) {
            var width;
            var ratio = window.devicePixelRatio || 1;

            if (size.width * ratio > 2045) {
                width = 2045;
            } else {
                width = size.width * ratio;
            }

            var s = src.split('/');
            var last = s[s.length - 1];
            s[s.length - 1] = 's' + width;
            s.push(last);
            return s.join('/');
        }

        //cache
        var meta = $('#J_Meta');
        var metap = $('#J_Metap');
        var img = $('#J_Img');
        var photoWrapper = $('#J_PhotoWrapper');

        var photo = {
            show: function(entry) {
                var size = picFillSize(entry.media$group.media$thumbnail[2]);

                photoWrapper.width(size.width).height(size.height).fadeIn('slow', function() {
                    img.attr('src', resolveSrc(size, entry.content.src));
                    img.on('load', function() {
                        img.fadeIn('slow', function() { 
                            metap.html(entry.summary.$t);
                            metap.width(size.width - 20);
                            meta.fadeIn('slow');
                        });
                    });

                });
            },
            hide: function() { 
                metap.hide();
                img.hide();
            }
        };

        getPicasa(function(data) {
            console.log(data);
            photo.show(data.feed.entry[1]);
        });

    };
}(jQuery, window));
