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
    $.pizza = function(opts) {

        var defaultOpts = {
            username: 'wlsy638',
            albumid: '5834489861667785793',
            picasaServer: 'picasaweb.google.com',
            picServer: undefined,
            perPageResults: 10,
            papi: undefined
        };

        // cache picasa data
        var aPhoto = {
            photo: [],
            total: 0,
            nowIndex: 0
        };

        // cache dom
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

        //merge options
        opts = $.extend(defaultOpts, opts || {});
        opts.papi = (opts.papi) ? opts.papi : 'https://' + opts.picasaServer + '/data/feed/api/user/' + opts.username;

        /**
         * 填充图片为最合适的大小  
         *
         * @param {Ojbec} thumbnail 原始宽高
         * @return {Object} {width: xx; height: xxx} 全屏下最适合的图片宽高
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

            var size = {};

            if (maxHeightToWidth > (viewWitdh - leaveWidth)) {
                size.width = viewWitdh - leaveWidth;
                size.height = size.width / scale;
            } else {
                size.width = maxHeight * scale;
                size.height = maxHeight;
            }

            size.width = Math.round(size.width);
            size.height = Math.round(size.height);

            // return computed size
            return size;
        }

        /**
         * formatDate  
         *
         * 用在图片描述中的定格时间
         *
         * @param {Number} time
         * @api private
         */
        function formatDateTime(time) {
            var date = new Date(Number(time));
            if (date == "Invalid Date") {
                return time;
            }

            var formatDate = {
                year: (date.getUTCFullYear() < 1000) ? date.getUTCFullYear() += 1900 : date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate(),
                hours: date.getUTCHours(),
                minutes: (date.getUTCMinutes() < 10) ? "0" + (date.getUTCMinutes()) : (date.getUTCMinutes()),
                seconds: (date.getUTCSeconds() < 10) ? "0" + date.getUTCSeconds() : date.getUTCSeconds()
            };

            return formatDate.year + '年' + formatDate.month + '月' + formatDate.day + '日 ' + ((formatDate.hours > 12) ? '下午' + (formatDate.hours - 12) + '点' : '上午' + formatDate.hours + '点') + formatDate.minutes + '分' + formatDate.seconds + '秒';

        }

        /**
         * get data from picasa 
         *
         * @param {Object} config 请求picasa的配置选项
         * @param {Function} next 请求成功的回调
         * @api private
         */

        function getPicasa(config, next) {

            if (arguments.length === 1) {
                next = config;
            }

            config = $.extend({
                kind: 'photo',
                tag: '',
                photoid: undefined,
                page: 0
            }, config || {});

            var query = '?alt=json&kind=' + config.kind + ((config.kind == 'tag') ? '' : ((config.tag !== '') ? '&tag=' + config.tag : '&start-index=' + (config.page * opts.perPageResults + 1) + '&max-results=' + opts.perPageResults));

            var url = config.photoid ? opts.papi + '/photoid/' + config.photoid + '?alt=json' : opts.papi + '/albumid/' + opts.albumid + query;

            $.ajax({
                url: url,
                dataType: 'jsonp',
                success: function(data) {

                    // 统一单图片请求格式跟专辑一致
                    if (config.photoid) {
                        data.feed.entry = [data.feed];
                    }

                    if (config.kind === 'tag') {
                        var tags = [];
                        $.each(data.feed.entry, function(index, el) {
                            tags.push(el.title.$t);
                        });
                        return next.call(null, tags);
                    }

                    if (config.tag !== '') {
                        aPhoto.photo = [];
                    }

                    $.each(data.feed.entry, function(index, el) {
                        var p = {};
                        p.id = el.gphoto$id.$t;
                        p.size = {
                            width: el.gphoto$width.$t,
                            height: el.gphoto$height.$t
                        };

                        //坑爹的使用tag筛选图片居然没有图片的exif信息，是picasa的bug吗
                        p.time = el.exif$tags ? el.exif$tags.exif$time.$t : false;
                        p.meta = el.media$group.media$description.$t;
                        p.tag = el.media$group.media$keywords.$t;
                        p.src = el.media$group.media$content[0].url;

                        aPhoto.photo.push(p);
                    });

                    aPhoto.total = data.feed.openSearch$totalResults.$t;
                    aPhoto.startIndex = data.feed.openSearch$startIndex.$t;
                    aPhoto.itemsPerPage = data.feed.openSearch$itemsPerPage.$t;

                    next.call(null, aPhoto);
                }
            });
        }

        /**
         * 根据图片大小来决定使用最合适的图片大小
         *
         * picasa 图片能生成任意图片大小, 真给力
         * 专为retina屏幕优化
         *
         * @param {Object} size 图片的大小
         * @param {Object} src 图片的picasa链接地址
         *
         */
        
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
            var newSrc = opts.picServer ? s.join('/').replace('https', opts.picServer[0]).replace('googleusercontent', opts.picServer[1]) : s.join('/');
            return newSrc;
        }

        /**
         * 禁用控制按钮  
         *
         * @api private
         */

        function controlDisabled() {
            switch (aPhoto.nowIndex) {
            case 0:
                photoPrev.addClass('pizzaControlDisabled');
                photoNext.removeClass('pizzaControlDisabled');
                break;

            case aPhoto.total - 1:
                photoNext.addClass('pizzaControlDisabled');
                photoPrev.removeClass('pizzaControlDisabled');
                break;

            default:
                photoPrev.removeClass('pizzaControlDisabled');
                photoNext.removeClass('pizzaControlDisabled');
            }

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
                        page: aPhoto.photo.length / aPhoto.itemsPerPage
                    }, function(data) {
                        render(data);
                    });
                } else {
                    render(data);
                }

                /**
                 *  渲染生成图片
                 *
                 *  @param {Object} data from getPicasa()
                 *  @api private
                 */

                function render(data) {
                    var size = fillPicSize(data.photo[index].size);
                    var photo = data.photo[index];
                    photoWrapper.width(size.width).height(size.height).fadeIn('slow', function() {
                        img.attr('src', resolveSrc(size, photo.src));

                        nowIndex.fadeOut('fast', function() {
                            nowIndex.html(aPhoto.nowIndex + 1);
                            nowIndex.fadeIn('fast');
                        });

                        img.one('load', function() {
                            loading.hide();
                            window.location.hash = photo.id;
                            img.fadeIn('slow', function() {
                                if (photo.time) {
                                    metap.html(photo.meta + '<span class="pizzaTg">——定格于' + formatDateTime(photo.time) + ' 在' + photo.tag + '</span>');
                                } else {
                                    metap.html(photo.meta + '<span class="pizzaTg">——在' + photo.tag + '</span>');
                                }
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
            photo.next(aPhoto);
        });

        photoPrev.on('click', function(ev) {
            ev.preventDefault();
            photo.prev(aPhoto);
        });

        //key controller
        $(document).keydown(function(e){
            if (e.keyCode == 37 ||e.keyCode == 38 ) { 
                photo.prev(aPhoto);
                return false;
            }
            if (e.keyCode == 39 ||e.keyCode == 40 ) { 
                photo.next(aPhoto);
                return false;
            }

        });

        /**
         * onload  go go go
         */
        function init() {
            $("<style> .pizzaControlDisabled{ opacity: 0.6; cursor: not-allowed;} </style>").appendTo("head");

            if (win.location.hash !== '') {
                photoid = window.location.hash.substr(1);
                getPicasa({
                    photoid: photoid
                }, function(data) {
                    photo.show(data);
                    index.html('<a href="/">返回</a>');
                    index.fadeIn();
                });
            } else {
                getPicasa(function(data) {
                    photo.show(data);
                    total.html(data.total);
                    nowIndex.html(data.index);
                    index.fadeIn();
                    controlDisabled();
                });
            }

        }

        init();

        function switchShow(data) {
            photo.show(data);
            total.html(data.total);
            nowIndex.html(data.index);
            index.fadeIn();
            controlDisabled();
        }

        function switchHide(data) {
            photo.hide();
            photoWrapper.hide();
            loading.show();
        }

        //for tags
        $('body').on('click', '#J_Tags', function(ev) {
            ev.preventDefault();
            $('#tags').fadeToggle();
            getPicasa({
                kind: 'tag'
            }, function(data) {
                var html = '';
                for (var i = 0, l = data.length; i < l; i++) {
                    html += '<a href="#">' + data[i] + '</a>';
                }
                $('#tags').html(html);
            });
        });

        $('body').on('click', '#tags a', function(ev) {
            ev.preventDefault();
            var tag = $(this).html();

            $('#tags').toggle();
            $('#tag').fadeOut();
            switchHide();
            getPicasa({
                tag: tag
            }, function(data) {
                switchShow(data);
                $('#tag').html('<a href="#">' + tag + '<b>⊗</b></a>').fadeIn();
            });
        });

        $('body').on('click', '#tag a', function(ev) {
            ev.preventDefault();
            $('#tag').fadeOut();
            switchHide();
            aPhoto.photo = [];
            getPicasa(function(data) {
                switchShow(data);
            });
        });
    }
}(jQuery, window));
