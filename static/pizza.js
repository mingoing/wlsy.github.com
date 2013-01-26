/**
 * Picasa like pizza delicious  
 *
 * @version 0.1.0
 * @author wlsy <i@wlsy.me>
 */

(function($, win) {

    /**
     * pizza core
     */
    $.fn.pizza = function(opts) {

        var defaultOpts = {
            username: 'wlsy638',
            albumid: '5834489861667785793',
            picasaServer: 'picasaweb.google.com',
            perPageResults: 10,
            papi: undefined
        };

        // get from picasa
        var arPhoto = {
            photo: [],
            total: 0,
            nowIndex: 0
        };

        // cache
        var meta = $('#J_PizzaMeta');
        var metap = $('#J_PizzaMetap');
        var img = $('#J_PizzaImg');
        var photoWrapper = $('#J_PizzaWrapper');
        var loading = $('#J_PizzaLoading');
        var photoNext = $('#J_PizzaNext');
        var photoPrev = $('#J_PizzaPrev');
        var index = $('#J_PizzaIndex');
        var total = $('#J_PizzaTotalIndex');
        var nowIndex = $('#J_PizzaNowIndex');

        opts = $.extend(defaultOpts, opts || {});

        /**
         * 填充图片为最合适的大小  
         *
         * @param {Ojbec} thumbnail 图片宽度和高度
         * @return {Object} {width: xx; height: xxx}
         * @api private
         */

        function fillPicSize(thumbnail) {
            if (!$.isPlainObject(thumbnail) && thumbnail.width && thumbnail.height) {
                return new Error("Invalid Param: fillPicSize();");
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

            size.width = Math.round(size.width);
            size.height= Math.round(size.height);
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

        /**
         * get data  
         */

        function getPicasa(config, next) {

            if (arguments.length === 1) {
                next = config;
            }

            config = $.extend({
                kind: 'photo',
                page: 0
            }, config || {});

            $.ajax({
                url: opts.papi || 'https://' + opts.picasaServer + '/data/feed/api/user/' + opts.username + '/albumid/' + opts.albumid + '?kind=' + config.kind + '&alt=json&start-index=' + (config.page * opts.perPageResults + 1) + '&max-results=' + opts.perPageResults,
                dataType: 'jsonp',
                success: function(data) {
                    $.each(data.feed.entry, function(index, el) {
                        var p = {};
                        p.id = el.gphoto$id.$t;
                        p.size = {
                            width: el.gphoto$width.$t,
                            height: el.gphoto$height.$t
                        };
                        p.time = el.exif$tags.exif$time.$t;
                        p.meta = el.summary.$t;
                        p.tag = el.media$group.media$keywords.$t;
                        //photo.size = el.gphoto$size;
                        p.src = el.content.src;

                        arPhoto.photo.push(p);
                    });

                    arPhoto.total = data.feed.openSearch$totalResults.$t;
                    arPhoto.startIndex = data.feed.openSearch$startIndex.$t;
                    arPhoto.itemsPerPage = data.feed.openSearch$itemsPerPage.$t;

                    next.call(null, arPhoto);
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

        /**
         * 禁用控制按钮  
         *
         * @api private
         */

        function controlDisabled() {
            switch (arPhoto.nowIndex) {
            case 0:
                photoPrev.addClass('pizzaControlDisabled');
                break;

            case arPhoto.total - 1:
                photoNext.addClass('pizzaControlDisabled');
                break;

            default:
                photoPrev.removeClass('pizzaControlDisabled');
                photoNext.removeClass('pizzaControlDisabled');
            }

        }

        /**
         * onload   
         */

        function init(data) {
            $("<style> .pizzaControlDisabled{ opacity: 0.6; cursor: not-allowed;} </style>").appendTo("head");
            total.html(data.total);
            nowIndex.html(data.index);
            index.fadeIn();
            controlDisabled();
        }

        var photo = {
            show: function(data, index) {

                if (arguments.length === 1) {
                    index = 0;
                }

                loading.show();
                data.nowIndex = index;

                //分页获取
                if (data.nowIndex === data.photo.length && data.nowIndex < data.total) {
                    getPicasa({
                        page: arPhoto.photo.length / arPhoto.itemsPerPage 
                    }, function(data) { 
                        render(data);
                    });
                } else {
                    render(data);
                }

                /**
                 *  渲染生成图片
                 */

                function render(data) {
                    var size = fillPicSize(data.photo[index].size);
                    photoWrapper.width(size.width).height(size.height).fadeIn('slow', function() {
                        img.attr('src', resolveSrc(size, data.photo[index].src));

                        nowIndex.fadeOut('fast', function() {
                            nowIndex.html(arPhoto.nowIndex + 1);
                            nowIndex.fadeIn('fast');
                        });

                        img.one('load', function() {
                            loading.hide();
                            img.fadeIn('slow', function() {
                                metap.html(data.photo[index].meta);
                                metap.width(size.width - 20);
                                meta.fadeIn('slow');
                                //preload next pic
                                if (data.nowIndex < data.photo.length - 1) {
                                    $('<img/>')[0].src = resolveSrc(size, data.photo[index + 1].src);
                                    
                                }
                            });
                        });

                    });
                }

            },

            next: function(data, index) {
                if (arguments.length === 1) {
                    index = data.nowIndex + 1 || 0;
                }
                if (data.nowIndex === data.total - 1) {
                    return;
                }
                this.hide();
                this.show(data, index);

                controlDisabled();
            },

            prev: function(data, index) {
                if (arguments.length === 1) {
                    index = data.nowIndex - 1 || 0;
                }
                if (data.nowIndex === 0) {
                    return;
                }
                this.hide();
                this.show(data, index);

                controlDisabled();
            },

            hide: function() {
                meta.hide();
                img.hide();
            }
        };

        photoNext.on('click', function(ev) {
            ev.preventDefault();
            photo.next(arPhoto);
        });

        photoPrev.on('click', function(ev) {
            ev.preventDefault();
            photo.prev(arPhoto);
        });

        getPicasa(function(data) {
            photo.show(data);
            init(data);
        });

    };
}(jQuery, window));
