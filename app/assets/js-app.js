// node.js modules
	node.require('fs')
	node.require('nedb')
	node.require('mkdirp')
	node.require('request')
	node.require('request-progress')
	node.require('semver')
	node.require('url')
	var Q = node.require('q')
		,markdown = node.require( "markdown" ).markdown





// Global Variables
	_g.animate_duration_delay = 320;
	_g.inputIndex = 0
	_g.lang = 'zh_cn'

	_g.path = {
		'db': 		node.path.join(_g.root, '/app-db/'),
		'page': 	node.path.join(_g.root, '/app/page/'),
		'bgimg_dir':node.path.join(_g.root, '/app/assets/images/homebg/'),
		'pics': {
			'ships': 	node.path.join(_g.root, '/pics/ships/'),
			'items': 	node.path.join(_g.root, '/pics/items/')
		}
	}

	_g.pathMakeObj = function(obj){
		for( var i in obj ){
			if( typeof obj[i] == 'object' ){
				_g.pathMakeObj( obj[i] )
			}else{
				node.mkdirp.sync( obj[i] )
			}
		}
	}
	_g.pathMakeObj( _g.path )

	_g.data = {
		'entities': {},

		'items': {},
		'item_types': {},

		'ships': {},
		'ship_id_by_type': [], 			// refer to _g.ship_type_order
		'ship_types': {},
		'ship_type_order': {},
		'ship_classes': {}
	}

	var _db = {
		'entities': new node.nedb({
				filename: 	_g.path.db + '/entities.json'
			}),

		'items': new node.nedb({
				filename: 	_g.path.db + '/items.json'
			}),
		'item_types': new node.nedb({
				filename: 	_g.path.db + '/item_types.json'
			}),
		'item_type_collections': new node.nedb({
				filename: 	_g.path.db + '/item_type_collections.json'
			}),

		'ships': new node.nedb({
				filename: 	_g.path.db + '/ships.json'
			}),
		'ship_types': new node.nedb({
				filename: 	_g.path.db + '/ship_types.json'
			}),
		'ship_type_collections': new node.nedb({
				filename: 	_g.path.db + '/ship_type_collections.json'
			}),
		'ship_type_order': new node.nedb({
				filename: 	_g.path.db + '/ship_type_order.json'
			}),
		'ship_classes': new node.nedb({
				filename: 	_g.path.db + '/ship_classes.json'
			}),
		'ship_series': new node.nedb({
				filename: 	_g.path.db + '/ship_series.json'
			}),
		'ship_namesuffix': new node.nedb({
				filename: 	_g.path.db + '/ship_namesuffix.json'
			}),

		'updates': new node.nedb({
				filename: 	_g.path.db + '/updates.json'
			})
	}
	_g.ship_type_order = []
	_g.ship_type_order_map = {}
















// Global Functions
	_g.statSpeed = {
		5: 	'低速',
		10: '高速'
	}
	_g.statRange = {
		1: 	'短',
		2: 	'中',
		3: 	'长',
		4: 	'超长'
	}
	_g.getStatSpeed = function( speed ){
		speed = parseInt(speed)
		return _g.statSpeed[speed]
	}
	_g.getStatRange = function( range ){
		range = parseInt(range)
		return _g.statRange[range]
	}
	_g.getName = function( nameObj, joint, lang ){
		joint = joint || ''
		if( !nameObj )
			return null
		return (
				nameObj[ _g.lang ] || nameObj['ja_jp']
				) + (
				nameObj.suffix ? (
						joint + (
								_g.data['ship_namesuffix'][nameObj.suffix][ _g.lang ] || _g.data['ship_namesuffix'][nameObj.suffix]['ja_jp']
							)
					) : ''
				)
	}
	_g.log = function(log){
		if( debugmode )
			console.log(log)
	}
















// Global Frame
_frame.app_main = {
	page: {},
	page_dom: {},

	// is_init: false
	//bgimg_dir: 	'./app/assets/images/homebg',
	bgimgs: 	[],
	// cur_bgimg_el: null

	// cur_page: null

	// 尚未载入完毕的内容
		loading: [
			'dbs',
			'bgimgs',
			'db_namesuffix'
		],
		// is_loaded: false,

	// 页面初始化载入完毕后执行的函数组
		functions_on_ready: [],

	// 载入完毕一项内容，并检查其余内容是否载入完毕
	// 如果全部载入完毕，#layout 添加 .ready
		loaded: function( item, is_instant ){
			if( item ){
				var index = _frame.app_main.loading.indexOf(item)
				if( index > -1 ){
					_frame.app_main.loading.splice(_frame.app_main.loading.indexOf(item), 1)
					_frame.app_main.is_loaded = false
				}
			}
			if( !_frame.app_main.loading.length && !_frame.app_main.is_loaded ){
				setTimeout(function(){
					if( _frame.app_main.is_loaded && !_frame.app_main.loading.length && !$html.hasClass('app-ready') ){
						_frame.dom.layout.addClass('ready')
						$html.addClass('app-ready')
						setTimeout(function(){
							for(var i in _frame.app_main.functions_on_ready){
								_frame.app_main.functions_on_ready[i]()
							}
						}, 1500)
					}
				}, is_instant ? 300 : 1000)

				// 绑定onhashchange事件
				//	$window.on('hashchange.pagechange', function(){
				//		_frame.app_main.load_page_func(_g.uriHash('page'))
				//	})

				// 初次检查 uriSearch
					if( !this.window_event_bound ){
						$window.on('popstate._global', function(e){
							if( e.originalEvent && e.originalEvent.state ){
								_frame.app_main.state( e.originalEvent.state )
							}else{
								var _uriGet = location.search ? location.search.split('?')[1] : ''
									,uriGet = {}
								_uriGet = _uriGet.split('&');
								for(var i=0;i<_uriGet.length;i++){
									var h=_uriGet[i].split('=')
									uriGet[h[0]] = h[1] || true
								}
								// 首次运行，检查是否存在 page
									if( !_frame.app_main.window_event_bound && !(uriGet['page'] || uriGet['infos']) ){
										_frame.app_main.load_page( _frame.app_main.nav[0]['page'] )
										//uriGet['page'] = _frame.app_main.nav[0]['page']
									}
								_frame.app_main.state( uriGet )
							}
						}).trigger('popstate._global')
						this.window_event_bound = true
					}

				//_frame.app_main.load_page_func(_g.uriHash('page'))
				_frame.app_main.is_loaded = true
			}
		},


	// pushState
		pushState: function( stateObj, title, url ){
			history.pushState( stateObj, title, url )

			if( !stateObj['infos'] )
				_frame.infos.hide()
		},


	// 根据 history state 运行相应函数
		state: function( stateObj ){
			//_g.log( stateObj )
			if( stateObj['infos'] ){
				_frame.infos.show_func( stateObj['infos'], stateObj['id'], null, stateObj['infosHistoryIndex'] )
			}else{
				_frame.infos.hide()
			}
			if( stateObj['page'] ){
				this.load_page_func( stateObj['page'] )
			}
		},


	// 更换背景图
		//change_bgimg_fadein: false,
		change_bgimg: function( bgimgs_new ){
			// _frame.app_main.bgimgs 未生成，函数不予执行
			if( !_frame.app_main.bgimgs.length )
				return false

			var bgimgs = bgimgs_new && bgimgs_new.length ? bgimgs_new : _frame.app_main.bgimgs
				,img_new = bgimgs[_g.randInt(bgimgs.length)]
				,img_old = _frame.app_main.cur_bgimg_el ? _frame.app_main.cur_bgimg_el.css('background-image') : null

			img_old = img_old ? img_old.split('/') : null
			img_old = img_old ? img_old[img_old.length - 1].split(')') : null
			img_old = img_old ? img_old[0] : null

			while( img_new == img_old ){
				img_new = bgimgs[_g.randInt(bgimgs.length - 1)]
			}

			var img_new_blured = 'file://' + encodeURI( node.path.join( _g.path.bgimg_dir , '/blured/' + img_new ).replace(/\\/g, '/') )
			this.bgimg_path = node.path.join( _g.path.bgimg_dir , '/' + img_new )
			img_new = 'file://' + encodeURI( this.bgimg_path.replace(/\\/g, '/') )

			function delete_old_dom( old_dom ){
				setTimeout(function(){
					old_dom.remove()
				}, _g.animate_duration_delay)
			}

			if( img_old ){
				delete_old_dom( _frame.app_main.cur_bgimg_el )
			}

			//_frame.app_main.cur_bgimg_el = $('<img src="' + img_new + '" />').appendTo( _frame.dom.bgimg )
			_frame.app_main.cur_bgimg_el = $('<div/>').css('background-image','url('+img_new+')').appendTo( _frame.dom.bgimg )
											.add( $('<s'+( _frame.app_main.change_bgimg_fadein ? ' class="fadein"' : '' )+'/>').css('background-image','url('+img_new_blured+')').appendTo( _frame.dom.nav ) )
											.add( $('<s'+( _frame.app_main.change_bgimg_fadein ? ' class="fadein"' : '' )+'/>').css('background-image','url('+img_new_blured+')').appendTo( _frame.dom.main ) )

			if( _frame.dom.bg_controls )
				_frame.app_main.cur_bgimg_el = _frame.app_main.cur_bgimg_el
											.add( $('<s'+( _frame.app_main.change_bgimg_fadein ? ' class="fadein"' : '' )+'/>').css('background-image','url('+img_new_blured+')').appendTo( _frame.dom.bg_controls) )

			_frame.app_main.change_bgimg_fadein = true
		},





	// 隐藏内容，只显示背景图
		toggle_hidecontent: function(){
			_frame.dom.layout.toggleClass('hidecontent')
		},





	// 更换页面
		load_page: function( page ){
			if( _frame.app_main.cur_page == page || !page )
				return page

			this.pushState(
				{
					'page': 	page
				},
				null,
				'?page=' + page
			)
			this.load_page_func( page )
			//_g.uriHash('page', page)
		},
		load_page_func: function( page ){
			_g.log( 'PREPARE LOADING: ' + page )

			if( _frame.app_main.cur_page == page || !page )
				return page

			if( !_frame.app_main.page_dom[page] ){
				_frame.app_main.page_dom[page] = $('<div class="page" page="'+page+'"/>').appendTo( _frame.dom.main )
				var data = node.fs.readFileSync(_g.path.page + page + '.html', 'utf8')
				if(data){
					_frame.app_main.page_dom[page].html( data )
					if( _frame.app_main.page[page] && _frame.app_main.page[page].init )
						_frame.app_main.page[page].init(_frame.app_main.page_dom[page])
					_p.initDOM(_frame.app_main.page_dom[page])
				}
			}

			_frame.app_main.page_dom[page].removeClass('off').trigger('pageon')

			// 关闭之前的页面
				if( _frame.app_main.cur_page ){
					_frame.dom.navs[_frame.app_main.cur_page].removeClass('on')
					_frame.app_main.page_dom[_frame.app_main.cur_page].addClass('off').trigger('pageoff')
				}

			_frame.dom.navs[page].addClass('on')

			if( _frame.dom.layout.hasClass('ready') )
				_frame.app_main.change_bgimg()

			_frame.app_main.cur_page = page

			_g.log( 'LOADED: ' + page )
		},







	// 仅显示背景图
		// only_bg: false,
		only_bg_on: function(){
			if( this.only_bg )
				return true

			if( !_frame.dom.bg_controls ){
				_frame.dom.bg_controls = $('<div class="bg_controls"/>')
						.on('transitionend.only_bg_off', function(e){
							if( e.currentTarget == e.target
								&& e.originalEvent.propertyName == 'top'
								&& _frame.dom.layout.hasClass('only_bg')
								&& $(this).offset().top >= $body.height()
							){
								_frame.dom.layout.removeClass('only_bg')
								_frame.app_main.only_bg = false
							}
						})
						.appendTo(_frame.dom.layout)

				_frame.app_main.cur_bgimg_el = _frame.app_main.cur_bgimg_el.add(
						_frame.app_main.cur_bgimg_el.eq(0).clone().appendTo( _frame.dom.bg_controls)
					)

				$('<button class="prev" icon="arrow-left"/>')
						.on('click', function(){
							var pathParse = node.path.parse(_frame.app_main.bgimg_path)
								,index = $.inArray( pathParse['base'], _frame.app_main.bgimgs ) - 1
							if( index < 0 )
								index = _frame.app_main.bgimgs.length - 1
							_frame.app_main.change_bgimg( [_frame.app_main.bgimgs[index]] )
						})
						.appendTo(_frame.dom.bg_controls)

				$('<button class="back"/>')
						.html('返回')
						.on('click', function(){
							_frame.app_main.only_bg_off()
						})
						.appendTo(_frame.dom.bg_controls)

				$('<button class="back"/>')
						.html('保存图片')
						.on('click', function(){
							var pathParse = node.path.parse(_frame.app_main.bgimg_path)
								,index = $.inArray( pathParse['base'], _frame.app_main.bgimgs )
							_g.file_save_as( _frame.app_main.bgimg_path, (index + 1) + pathParse['ext'] )
						})
						.appendTo(_frame.dom.bg_controls)

				$('<button class="next" icon="arrow-right"/>')
						.on('click', function(){
							var pathParse = node.path.parse(_frame.app_main.bgimg_path)
								,index = $.inArray( pathParse['base'], _frame.app_main.bgimgs ) + 1
							if( index >= _frame.app_main.bgimgs.length )
								index = 0
							_frame.app_main.change_bgimg( [_frame.app_main.bgimgs[index]] )
						})
						.appendTo(_frame.dom.bg_controls)
			}

			_frame.dom.layout.addClass('only_bg')
			setTimeout(function(){
				_frame.dom.bg_controls.addClass('on')
			}, 10)

			this.only_bg = true
		},
		only_bg_off: function(){
			if( !this.only_bg )
				return true
			_frame.dom.bg_controls.removeClass('on')
			//_frame.dom.layout.removeClass('only_bg')
			//this.only_bg = false
		},
		only_bg_toggle: function(){
			if( this.only_bg )
				return this.only_bg_off()
			return this.only_bg_on()
		},








	init: function(){
		if( _frame.app_main.is_init )
			return true

		// 创建基础框架
			_frame.dom.nav = $('<nav/>').appendTo( _frame.dom.layout )
				_frame.dom.logo = $('<button class="logo" />')
									.on({
										'animationend, webkitAnimationEnd': function(e){
											$(this).addClass('ready-animated')
										}
									})
									.appendTo( _frame.dom.nav )
				/*
				_frame.dom.logo = $('<button class="logo" />').on('click', function(){
										_frame.app_main.toggle_hidecontent()
									})
									.html('<strong>' + node.gui.App.manifest['name'] + '</strong><b>' + node.gui.App.manifest['name'] + '</b>')
									.on({
										'animationend, webkitAnimationEnd': function(e){
											$(this).addClass('ready-animated')
										}
									})
									.appendTo( _frame.dom.nav )
				*/
				_frame.dom.navlinks = $('<div/>').appendTo( _frame.dom.nav )
				_frame.dom.globaloptions = $('<section class="options"/>').appendTo( _frame.dom.nav )
				_frame.dom.btnShowOnlyBg = $('<button class="show_only_bg" icon="images"/>')
										.on('click', function(){_frame.app_main.only_bg_toggle()}).appendTo( _frame.dom.globaloptions )
				_frame.dom.btnShowOnlyBgBack = $('<button class="show_only_bg_back" icon="arrow-set2-left"/>')
										.on('click', function(){_frame.app_main.only_bg_off()}).appendTo( _frame.dom.nav )
			_frame.dom.main = $('<main/>').appendTo( _frame.dom.layout )
			_frame.dom.bgimg = $('<div class="bgimg" />').appendTo( _frame.dom.layout )

		// 创建主导航
			if( _frame.app_main.nav && _frame.app_main.nav.length ){
				_frame.dom.navs = {}
				for( var i in _frame.app_main.nav ){
					var o = _frame.app_main.nav[i]
					_frame.dom.navs[o.page] = (function(page){
								return $('<button />').on('click', function(){
										_frame.app_main.load_page(page)
									})
							})(o.page).html(o.title).appendTo( _frame.dom.navlinks )
					//if( (i == 0 && !_g.uriHash('page') && !_g.uriSearch('page'))
					//	|| o.page == _g.uriSearch('page')
					//){
					//	_frame.dom.navs[o.page].trigger('click')
					//}
				}
			}

		var promise_chain 	= Q.fcall(function(){})

		// 开始异步函数链
			promise_chain

		// 获取背景图列表，生成背景图
			.then(function(){
				_g.log('背景图: START')
				var deferred = Q.defer()
				node.fs.readdir(_g.path.bgimg_dir, function(err, files){
					if( err ){
						deferred.reject(new Error(err))
					}else{
						var bgimgs_last = _config.get('bgimgs')
							,bgimgs_new = []
						bgimgs_last = bgimgs_last ? bgimgs_last.split(',') : []
						for( var i in files ){
							var lstat = node.fs.lstatSync( node.path.join( _g.path.bgimg_dir , '/' + files[i]) )
							if( !lstat.isDirectory() ){
								_frame.app_main.bgimgs.push( files[i] )

								// 存在bgimgs_last：直接比对
								// 不存在bgimgs_last：比对每个文件，找出最新者
								if( bgimgs_last.length ){
									if( $.inArray( files[i], bgimgs_last ) < 0 )
										bgimgs_new.push( files[i] )
								}else{
									var ctime = parseInt(lstat.ctime.valueOf())
									if( bgimgs_new.length ){
										if( ctime > bgimgs_new[1] )
											bgimgs_new = [ files[i], ctime ]
									}else{
										bgimgs_new = [ files[i], ctime ]
									}
								}
							}
						}
						if( !bgimgs_last.length )
							bgimgs_new.pop()
						_config.set(
							'bgimgs',
							_frame.app_main.bgimgs
						)
						_frame.app_main.change_bgimg( bgimgs_new );
						_frame.app_main.loaded('bgimgs')
						//if( !_g.uriHash('page') )
						//	_frame.app_main.load_page( _frame.app_main.nav[0].page )
						//setTimeout(function(){
						//	_frame.dom.layout.addClass('ready')
						//}, 1000)
						_g.log('背景图: DONE')
						deferred.resolve()
					}
				})
				return deferred.promise
			})

		// 读取db
			.then(function(){
				_g.log('Preload All DBs: START')
				var the_promises = []
					,dbs = []
					,loaded_count = 0

				for( var db_name in _db ){
					dbs.push(db_name)
				}

				dbs.forEach(function(db_name){
					var deferred = Q.defer()
					function _done(_db_name){
						_g.log('DB ' + _db_name + ' DONE')
						deferred.resolve()
						loaded_count++
						if( loaded_count >= dbs.length ){
							_g.log('Preload All DBs: DONE')
							setTimeout(function(){
								_frame.app_main.loaded('dbs')
							}, 100)
						}
					}
					_db[db_name].loadDatabase(function(err){
						if( err ){
							deferred.reject(new Error(err))
						}else{
							switch( db_name ){
								/*
									case 'entities':
									case 'items':
									case 'item_types':
									case 'ship_classes':
									case 'ship_types':
										_db[db_name].find({}, function(err, docs){
											if( typeof _g.data[db_name] == 'undefined' )
												_g.data[db_name] = {}
											for(var i in docs ){
												_g.data[db_name][docs[i]['id']] = docs[i]
											}
											_db_load_next()
										})
										break;
									*/
								case 'ship_namesuffix':
									_db.ship_namesuffix.find({}).sort({ 'id': 1 }).exec(function(dberr, docs){
										if( dberr ){
											deferred.reject(new Error(dberr))
										}else{
											_g.data.ship_namesuffix = [{}].concat(docs)
											_frame.app_main.loaded('db_namesuffix')
											_done(db_name)
										}
									})
									break;
								case 'ship_type_order':
									_db.ship_type_order.find({}).sort({'id': 1}).exec(function(dberr, docs){
										if( dberr ){
											deferred.reject(new Error(dberr))
										}else{
											for(var i in docs ){
												_g.ship_type_order.push(
													docs[i]['types'].length > 1 ? docs[i]['types'] : docs[i]['types'][0]
												)
												//_g.data['ship_type_order'][docs[i]['id']] = docs[i]
												_g.data['ship_type_order'][i] = docs[i]
											}
											// ship type -> ship order
												(function(){
													for( var i in _g.ship_type_order ){
														var index = parseInt(i)
														if( typeof _g.ship_type_order[i] == 'object' ){
															for( var j in _g.ship_type_order[i] ){
																_g.ship_type_order_map[ _g.ship_type_order[i][j] ] = index
															}
														}else{
															_g.ship_type_order_map[ _g.ship_type_order[i] ] = index
														}
													}
												})()
											_db.ships.find({}).sort({
												//'class': 1, 'class_no': 1, 'series': 1, 'type': 1, 'time_created': 1, 'name.suffix': 1
												'type': 1, 'class': 1, 'class_no': 1, 'time_created': 1, 'name.suffix': 1
											}).exec(function(dberr2, docs){
												if( dberr2 ){
													deferred.reject(new Error(dberr))
												}else{
													for(var i in docs){
														_g.data.ships[docs[i]['id']] = docs[i]

														if( typeof _g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ] == 'undefined' )
															_g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ] = []
														_g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ].push( docs[i]['id'] )
													}
													function __(i){
														var j=0
														while(
															_g.data.ship_id_by_type[i]
															&& _g.data.ship_id_by_type[i][j]
														){
															var i_remodel
															if( _g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next
																&& _g.data.ships[_g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next]
																&& _g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next != _g.data.ship_id_by_type[i][j+1]
																&& (i_remodel = $.inArray(_g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next, _g.data.ship_id_by_type[i])) > -1
															){
																_g.log(
																	_g.data.ship_id_by_type[i][j]
																	+ ', ' + _g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next
																	+ ', ' + i_remodel
																)
																_g.data.ship_id_by_type[i].splice(
																	i_remodel,
																	1
																)
																_g.data.ship_id_by_type[i].splice(
																	j+1,
																	0,
																	_g.data.ships[_g.data.ship_id_by_type[i][j]].remodel_next
																)
																__(i)
																break
															}
															if( j >= _g.data.ship_id_by_type[i].length - 2 ){
																i++
																j=0
															}else{
																j++
															}
														}
													}
													__(0)
													_done(db_name)
												}
											})
										}
									})
									break;
								case 'updates':
									if( typeof _g.data[db_name] == 'undefined' )
										_g.data[db_name] = {}
									_done(db_name)
									break;
								default:
									_db[db_name].find({}, function(dberr, docs){
										if( dberr ){
											deferred.reject(new Error(dberr))
										}else{
											if( typeof _g.data[db_name] == 'undefined' )
												_g.data[db_name] = {}
											for(var i in docs ){
												_g.data[db_name][docs[i]['id']] = docs[i]
											}
											_done(db_name)
										}
									})
									break;
							}

						}
					})
					the_promises.push(deferred.promise)
				})

				return Q.all(the_promises);
			})
		
		// 如果从启动器载入，检查数据是否有更新
			.then(function(){
				_g.log('数据更新检查: START')
				if( global.launcherOptions && global.launcherOptions["dataUpdated"] )
					return global.launcherOptions["dataUpdated"]
				return {}
			})
			.then(function(dataUpdated){
				var the_promises = []
					,updated = []
					,done_count = 0
					,html = ''

				for(var i in dataUpdated){
					var version = dataUpdated[i].split('.')
						,_version = ''

					for( var j = 0; j < Math.min(3, version.length); j++ )
						_version+= '.' + version[j]

					_version = _version.substr(1)
					updated.push({
						'type': 	i,
						'version': 	_version
					})
				}

				if( !updated.length ){
					_g.log('数据更新检查: DONE，无数据更新')
					return false
				}else{
					updated.forEach(function(obj){
						var deferred = Q.defer()

						function _done(item){
							_g.log('数据更新检查: '+item+' DONE')
							deferred.resolve()
							done_count++
							if( done_count >= updated.length ){
								if( html ){
									_g.log('数据更新检查: DONE')
									_frame.app_main.functions_on_ready.push(function(){
										_frame.modal.show(
											$('<div class="updates"/>')
												.html(html)
												.on('click.infosHideModal', '[data-infos]', function(){
													_frame.modal.hide()
												}),
											'<span>更新日志</span>',
											{
												'classname': 	'update_journal'
											}
										)
									})
								}else{
									_g.log('数据更新检查: DONE，无更新日志')
								}
								//setTimeout(function(){
								//}, 100)
							}
						}

						_db.updates.find(obj).sort({'date': -1}).exec(function(err, docs){
							if( err ){
								deferred.reject(new Error(err))
							}else{
								for( var i in docs ){
									html+= '<h3>'
											+ (docs[i]['type'] == 'app'
												? ''
												: (docs[i]['type'] == 'app-db' ? 'DB' : docs[i]['type']).toUpperCase() + ' / ')
											+ docs[i]['version']
											+ '<small>'+(docs[i]['date'] ? docs[i]['date'] : 'WIP')+'</small>'
											+ '</h3>'
											+ '<section class="update_journal"/>'
											+ _frame.app_main.page['about'].journal_parse(docs[i]['journal'])
											+ '</section>'
								}
								_done(obj['type'] + ' - ' + obj['version'])
							}
						})

						the_promises.push(deferred.promise)
					})

					return Q.all(the_promises);
				}
			})

		// 部分全局事件委托
			.then(function(){
				/*
					$html.on('click.openShipModal', '[data-shipid][modal="true"]', function(e){
						if( !(e.target.tagName.toLowerCase() == 'input' && e.target.className == 'compare') ){
							if( $(this).data('shipedit') ){
								try{
									//_frame.app_main.page['ships'].show_ship_form( _g.data.ships[ $(this).data('shipid') ] )
								}catch(err){}
							}else{
								try{
									_frame.app_main.show_ship( _g.data.ships[ $(this).data('shipid') ] )
								}catch(err){}
							}
						}
					})
				*/
				return true
			})

		// 鼠标侧键操作

		// Debug Mode
			.then(function(){
				if( debugmode ){
					_frame.dom.hashbar = $('<input type="text"/>')
							.on({
								'urlchanged': function(){
									$(this).val(
										location.href.substr( (location.origin + location.pathname).length )
									)
								},
								'change': function(){
									location.replace( location.origin + location.pathname + _frame.dom.hashbar.blur().val() )
								}
							})
							.appendTo(
								$('<div class="debug_hashbar"/>').appendTo(_frame.dom.layout)
							)
							.trigger( 'urlchanged' )
					_frame.dom.layout.addClass('debug-hashbar')
					$window.on({
						'hashchange.debug_mode_hashbar': function(){
							_frame.dom.hashbar.trigger('urlchanged')
						},
						'popstate.debug_mode_hashbar': function(){
							_frame.dom.hashbar.trigger('urlchanged')
						}
					})
					// HACK: 在 history.pushstate() 同时，触发 window.onpopstate 事件
					// http://felix-kling.de/blog/2011/01/06/how-to-detect-history-pushstate/
					function hackHistory(history){
						var pushState = history.pushState;
						history.pushState = function(state) {
							if (typeof history.onpushstate == "function") {
								history.onpushstate({state: state});
							}
							setTimeout(function(){
								//$window.trigger('popstate')
								_frame.dom.hashbar.trigger('urlchanged')
							}, 1)
							return pushState.apply(history, arguments);
						}
					}
					hackHistory(window.history);
				}
				return true
			})

		// 错误处理
			.catch(function (err) {
				_g.log(err)
			})
			.done(function(){
				_g.log('Global initialization DONE')
			})

		// 标记已进行过初始化函数
			_frame.app_main.is_init = true
	}
}
























// Modal: Ship
/*
	_frame.app_main.show_ship = function( d ){
		function _val( val, show_zero ){
			if( !show_zero && (val == 0 || val == '0') )
				return '<small class="zero">-</small>'
			if( val == -1 || val == '-1' )
				return '<small class="zero">?</small>'
			return val
		}

		_frame.modal.resetContent()

		if( debugmode )
			console.log(d)

		var dom = $('<div class="ship"/>')

		// 图鉴
			var illusts = $('<div class="illustrations"/>')
							.append(
								$('<img src="' + _g.path.pics.ships + '/' + d['id'] + '/2.jpg' + '"/>')
							)
							.appendTo(dom)

		// 舰种&舰级
			$('<small/>')
				.html(
					( d['class'] ? _g['data']['ship_classes'][d['class']]['name_zh'] + '级' : '' )
						+ ( d['class_no'] ? '<em>' + d['class_no'] + '</em>号舰' : '' )
						+ ( d['type'] ? '<br/>' + _g['data']['ship_types'][d['type']]['full_zh'] : '' )
				)
				.appendTo(dom)

		// 默认装备&搭载数
			var equips = $('<div class="equipments"/>').appendTo(dom)
				,i = 0
			while( i < 4 ){
				var equip = $('<button/>').appendTo(equips)
					,icon = $('<i/>').appendTo( equip )
					,name = $('<small/>').appendTo( equip )
					,slot = $('<em/>').appendTo( equip )

				if( typeof d['slot'][i] == 'undefined' ){
					equip.addClass('no')
				}else if( typeof d['equip'][i] == 'undefined' || !d['equip'][i] || d['equip'][i] === '' ){
					equip.addClass('empty')
					name.html( '--未装备--' )
					slot.html( d['slot'][i] )
				}else{
					var item_data = _g.data.items[d['equip'][i]]
						,item_icon = 'assets/images/itemicon/'
										+ _g.data.item_types[item_data['type']]['icon']
										+ '.png'
					function _stat(stat, title){
						if( item_data['stat'][stat] ){
							switch(stat){
								case 'range':
									return '<span>射程: ' + _g.getStatRange( item_data['stat'][stat] ) + '</span>';
									break;
								default:
									var val = parseInt( item_data['stat'][stat] )
									return '<span>' + ( val > 0 ? '+' : '') + val + ' ' + title + '</span>'
									break;
							}
						}else{
							return ''
						}
					}
					equip.attr({
						'data-itemid': 	d['equip'][i],
						'data-tip':		'<h3 class="itemstat">'
											+ '<s style="background-image: url(' + item_icon + ')"></s>'
											+ '<strong data-content="' + item_data['name']['zh_cn'] + '">'
												+ item_data['name']['zh_cn']
											+ '</strong>'
											+ '<small>' + _g.data.item_types[item_data['type']]['name']['zh_cn'] + '</small>'
										+ '</h3>'
										+ _stat('fire', '火力')
										+ _stat('torpedo', '雷装')
										+ _stat('aa', '对空')
										+ _stat('asw', '对潜')
										+ _stat('bomb', '爆装')
										+ _stat('hit', '命中')
										+ _stat('armor', '装甲')
										+ _stat('evasion', '回避')
										+ _stat('los', '索敌')
										+ _stat('range', '射程')
					})
					name.html(
						item_data['name']['zh_cn'].replace(/（([^（^）]+)）/g, '<small>($1)</small>')
					)
					slot.html( d['slot'][i] )
					icon.css(
						'background-image',
						'url(' + item_icon + ')'
					)
				}
				i++
			}

		// 属性
			var stat1 = $('<div class="stats"/>').appendTo(dom)
				,stat2 = $('<div class="stats"/>').appendTo(dom)
				,stat3 = $('<div class="stats"/>').appendTo(dom)
				,stat_consum = $('<div class="stats consum"/>').html('<strong>消耗</strong>').appendTo(dom)
			function _add_stat( name, title, val, tar ){
				$('<span/>')
					.html(
						'<small class="stat-'+name+'">' + title + '</small>'
						+ '<em>' + val + '</em>'
					)
					.appendTo(tar)
			}
			_add_stat( 'hp', 		'耐久', _val( d['stat']['hp'] ), 			stat1 )
			_add_stat( 'armor', 	'装甲', _val( d['stat']['armor_max'] ),		stat1 )
			_add_stat( 'evasion', 	'回避', _val( d['stat']['evasion_max'] ),	stat1 )
			_add_stat( 'carry', 	'搭载', _val( d['stat']['carry'] ),			stat1 )

			_add_stat( 'fire', 		'火力', _val( d['stat']['fire_max'] ),		stat2 )
			_add_stat( 'torpedo', 	'雷装', _val( d['stat']['torpedo_max'] ),	stat2 )
			_add_stat( 'aa', 		'对空', _val( d['stat']['aa_max'] ),		stat2 )
			_add_stat( 'asw', 		'对潜', _val( d['stat']['asw_max'], /^(5|8|9|12)$/.test( d['type'] ) ),		stat2 )

			_add_stat( 'speed', 	'航速', _g.getStatSpeed( d['stat']['speed'] ),		stat3 )
			_add_stat( 'range', 	'射程', _g.getStatRange( d['stat']['range'] ),		stat3 )
			_add_stat( 'los', 		'索敌', _val( d['stat']['los_max'] ),		stat3 )
			_add_stat( 'luck', 		'运', 	d['stat']['luck'] + '<sup>' + d['stat']['luck_max'] + '</sup>',		stat3 )

			_add_stat( 'fuel', 		'', _val( d['consum']['fuel'] ),		stat_consum )
			_add_stat( 'ammo', 		'', _val( d['consum']['ammo'] ),		stat_consum )

		// 声优&画师_g.data.entities
			$('<div class="entity"/>')
				.html(
					'<strong>声优</strong>'
					+ '<span>' + _g['data']['entities'][d['rels']['cv']]['name'][_g.lang] + '</span>'
				)
				.appendTo(dom)
			$('<div class="entity"/>')
				.html(
					'<strong>画师</strong>'
					+ '<span>' + _g['data']['entities'][d['rels']['illustrator']]['name'][_g.lang] + '</span>'
				)
				.appendTo(dom)

		// 改造信息
			if( d['series'] ){
				_db.ship_series.find({'id': d['series']}, function(err,docs){
					if( !err && docs && docs.length ){
						var prev_id = prev_lvl = prev_blueprint = next_id = next_lvl = next_blueprint = null
						// 遍历 docs[0].ships，寻找该舰娘ID，确定改造前后版本
							for(var i in docs[0].ships){
								if( docs[0].ships[i]['id'] == d['id'] ){
									var _i = parseInt(i)
									// 如果 i > 0，表明有改造前版本
										if( _i ){
											prev_id 		= docs[0].ships[ _i - 1 ]['id']
											prev_lvl 		= docs[0].ships[ _i - 1 ]['next_lvl']
											prev_blueprint 	= docs[0].ships[ _i - 1 ]['next_blueprint'] ? true : false
										}
									// 如果 i < docs[0].ships.length-1，表明有改造后版本
										if( _i < docs[0].ships.length-1 ){
											next_id 		= docs[0].ships[ _i + 1 ]['id']
											next_lvl 		= docs[0].ships[ _i ]['next_lvl']
											next_blueprint 	= docs[0].ships[ _i ]['next_blueprint'] ? true : false
										}
								}
							}
						// 根据刚才获得的数据创建改造信息DOM
							if( prev_id !== null || next_id !== null ){
								var remodels = $('<div class="remodels"/>').appendTo(dom)
								function shipDOM( ship_id, lvl, blueprint ){
									var ship_data = _g.data.ships[ship_id]
										,ship_name = ship_data['name']['zh_cn']
														+ (ship_data['name']['suffix']
															? '・' + _g.data.ship_namesuffix[ship_data['name']['suffix']]['zh_cn']
															: '')
										,tip = '<h3 class="shipinfo">'
													+ '<strong data-content="' + ship_name + '">'
														+ ship_name
													+ '</strong>'
													+ (
														ship_data['type'] ?
															'<small>' + _g['data']['ship_types'][ship_data['type']]['full_zh'] + '</span>'
															: ''
													)
												+ '</h3>'
									$('<div/>')
										.addClass('prev' + (blueprint ? ' blueprint' : '') )
										.html('<span>' + lvl + '</span>')
										.append(
											$('<button data-shipid="'+ ship_id +'" modal="true"/>')
												.attr('data-tip', tip)
												.html('<img src="' + _g.path.pics.ships + '/' + ship_id+'/0.jpg"/>')
										)
										.appendTo(remodels)
								}

								if( prev_id !== null )
									shipDOM(prev_id, prev_lvl, prev_blueprint)
								if( next_id !== null )
									shipDOM(next_id, next_lvl, next_blueprint)
							}
					}
				})
			}

		// 按钮
			var buttons = $('<div class="buttons"/>').appendTo(dom)

		_frame.modal.show(
			dom,
			_g.getName( d['name'], '・' ) || '舰娘',
			{
				'classname': 		'infos',
				'blank_to_close': 	true
			}
		)
	}
*/


/*
自动更新流程
	获取本地版本
		JSON.parse( _config.get['nwjs-data-version'] )
	获取远端版本
		http://fleet.diablohu.com/versions.json
		packages[name].version
	对比各数据包版本
	如果没有更新
		返回
	如果有更新
		创建更新器提示
		按顺序
			获取文件
				http://fleet.diablohu.com/ + packages[name].path
				更新器提示的更新进度
			检查文件大小和MD5
				packages[name].bytes
				packages[name].md5
			检查通过
				pipe 程序目录
					[name].updated
				删除原有数据包
				重命名新数据包
				如果以上过程发生错误
					权限不足
						提示用户
						TODO 弹出权限请求，之后继续流程
					其他原因
						放弃操作
		全部完成后
			删除 data/prev || 删除 [node.gui.App.dataPath]/Extracted Data/__prev__
			更新器提示的提示状态
*/

var _updater = {
	'local_versions':{},
	'remote_root':	'http://fleet.diablohu.com',
	'remote_url': 	'http://fleet.diablohu.com/versions.json',
	'remote_data': 	{}
}

// 获取本地版本
	_updater.get_local_version = function(){
		_updater.local_versions = JSON.parse( localStorage['nwjs-data-version'] || '{}' )
		return _updater.local_versions
	}

// 获取远端版本
	_updater.get_remote = function(){
		var deferred = Q.defer()
		node.request({
			'uri': 		_updater.remote_url,
			'method': 	'GET'
		}, function(err, response, body){
			if(err){
				deferred.reject(new Error(err))
			}else if(response.statusCode != 200){
				deferred.reject(new Error(response.statusCode))
			}else{
				_updater.remote_data = JSON.parse( body || '{}' ) || {}
				deferred.resolve( _updater.remote_data )
			}
		})
		return deferred.promise
	}

// 对比各数据包版本，检查哪些数据包需要更新
	_updater.get_packages_updated = function(){
		// compare version
			// 对比版本号 a 相对于 b
			// a > b => 1
			// a = b => 0
			// a < b => -1
			function compareVersion(a, b) {
				var i;
				var len;

				if (typeof a + typeof b !== 'stringstring') {
					return false;
				}

				a = a.split('.');
				b = b.split('.');
				i = 0;
				len = Math.max(a.length, b.length);

				for (; i < len; i++) {
					if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) {
						return 1;
					} else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) {
						return -1;
					}
				}

				return 0;
			};
		var updated = []

		for( var i in _updater.local_versions ){
			if( _updater.remote_data.packages && _updater.remote_data.packages[i] ){
				var remote_version = _updater.remote_data.packages[i].version
										? _updater.remote_data.packages[i].version
										: _updater.remote_data.packages[i]
				if( compareVersion( remote_version , _updater.local_versions[i] ) > 0 )
					updated.push(i)
			}
		}


		// 根据文件大小升序排序
		return updated.sort(function(a, b){
			// 降序
				//return _updater.remote_data.packages[b].bytes - _updater.remote_data.packages[a].bytes
			// 升序
				return _updater.remote_data.packages[a].bytes - _updater.remote_data.packages[b].bytes
		})
	}

// 创建更新器提示
	_updater.create_update_indicator = function(){
		if( !_updater.update_indicator || !_updater.update_indicator.length ){
			_updater.update_indicator = $('<button class="update_progress" icon="stairs-up" data-tip="检测到新版本<br>更新中..."/>').appendTo( _frame.dom.globaloptions )
			_updater.update_indicator_bar = $('<s/>').appendTo( _updater.update_indicator )
		}
	}

// 更新数据包流程
	_updater.update = function(){
		var promise_chain 	= Q.fcall(function(){})
			,dirRoot = node.path.dirname(process.execPath).split(node.path.sep)
			,dirData = ''
			,datadir_exists = false
		dirRoot = (process.platform == 'darwin' || (dirRoot[dirRoot.length - 1] == 'nwjs' && node.path.basename( process.execPath ) == 'nw.exe') )
					? process.cwd()
					: node.path.dirname(process.execPath)
		dirData = node.path.join( dirRoot, 'data' )

		// 开始异步函数链
			promise_chain

		// 检查数据包目录是否存在
			.then(function(){
				var deferred = Q.defer()
				node.fs.lstat(dirData, function(err, stats){
					if( err || !stats.isDirectory() ){
						deferred.reject( '数据包目录不存在, 不进行自动更新' )
					}else{
						datadir_exists = true
						deferred.resolve( true )
					}
				})
				return deferred.promise
			})

		// 获取数据包目录下的文件列表，并筛选 .updated 文件
			.then(function(){
				var deferred = Q.defer()
				node.fs.readdir(dirData, function(err, files){
					if( err ){
						deferred.reject( err )
					}else{
						var selected = []
						for(var i in files){
							if( node.path.extname(files[i]) == '.updated' )
								selected.push(files[i])
						}
						deferred.resolve( selected )
					}
				})
				return deferred.promise
			})

		// 清理数据包目录下所有的 .updated 文件
			.then(function(files){
				var the_promises = []
				files.forEach(function(filename){
					var deferred = Q.defer()
					node.fs.unlink( node.path.join( dirData, filename ), function(err){
						_g.log('已删除更新残留文件 ' + filename)
						deferred.resolve()
					} )
					the_promises.push(deferred.promise)
				})
				return Q.all(the_promises);
			})

		// 其余流程
			.then(_updater.get_local_version())
			.then(_updater.get_remote)
			.then(_updater.get_packages_updated)
			.then(function(updated){
				if( !updated.length ){
					_g.log('所有数据包均为最新')
					return false
				}

				_g.log('自动更新过程开始 (' + updated.join(', ') + ')')
				_updater.create_update_indicator()
				var promise_chain_update = Q.fcall(function(){})
					,count = 0
					,permission = true
					,size_total = 0
					,size_received = 0

				updated.forEach(function(package_name){
					(function(package_name, count){
						size_total+= _updater.remote_data.packages[package_name].bytes

						promise_chain_update = promise_chain_update.then(function(){
							var deferred = Q.defer()
								,savefile = false

							var tempfile = node.path.join(
										dirData,
										package_name
										+ node.path.extname(_updater.remote_data.packages[package_name].path)
										+ '.updated'
									)
								,targetFile = node.path.join(
										dirData,
										package_name
										+ node.path.extname(_updater.remote_data.packages[package_name].path)
									)

							/*
							tempfile = node.path.join(
										node.path.normalize('C:\Program Files (x86)\\'),
										'__' + package_name
										+ node.path.extname(_updater.remote_data.packages[package_name].path)
									)
							*/

							function err_handler(err, msg){
								msg = msg || ''
								if( err.errno == -4048 || err.message.indexOf( 'not permitted' ) > -1 ){
									_g.log('    ' + msg + '权限不足')
								}else{
									_g.log(err)
									_g.log('    ' + msg + '发生错误 [' +err.errno+ ']: ' + err.message)
								}
							}

							_g.log('')
							_g.log('========== ' + count + '/' + updated.length + ' ==========')
							_g.log('')
							_g.log('    ' + package_name
								+ ' | 本地版本: ' + _updater.local_versions[package_name]
								+ ' | 服务器版本: ' + (_updater.remote_data.packages[package_name].version
														? _updater.remote_data.packages[package_name].version
														: _updater.remote_data.packages[package_name])
							)

							node['request-progress'](
							node.request({
								'uri': 		node.url.format(
												_updater.remote_root + '/'
												+ _updater.remote_data.packages[package_name].path
											),
								'method': 	'GET'
							}).on('error',function(err){
								_g.log('    下载数据包出错')
								node.fs.unlink(tempfile, function(err2){
									deferred.reject(new Error(err))
								})
								//deferred.reject(new Error(err))
							})/*.on('response', function(response){
								if( response.statusCode == 200
									&& parseInt(response.headers['content-length']) == _updater.remote_data.packages[package_name].bytes
								)
									savefile = true
							})*/).on('error',function(err){
								_g.log('    下载数据包出错')
								node.fs.unlink(tempfile, function(err2){
									deferred.reject(new Error(err))
								})
								//deferred.reject(new Error(err))
							}).on('progress',function(state){
								_updater.update_indicator.addClass('on')
								_g.log('    ' + state.received + ' / ' + state.total + ' (' + state.percent + '%)'
									+ ' | ' + Math.floor( (size_received + state.received) / size_total * 100 ) + '%'
								)
								_updater.update_indicator_bar.css('width', Math.floor( (size_received + state.received) / size_total * 100 ) + '%')
							}).pipe(
								node.fs.createWriteStream(tempfile)
								.on('finish', function(){
									//if( savefile ){
										size_received+= _updater.remote_data.packages[package_name].bytes
										node.fs.unlink(targetFile, function(err){
											if( err ){
												err_handler(err, '删除原有数据包')
												_g.log('    跳过')
												deferred.resolve()
											}else{
												node.fs.rename(
													tempfile,
													targetFile,
													function(err){
														if( err ){
															err_handler(err, '重命名新数据包')
															_g.log('    跳过')
														}else{
															_g.log('    该数据包更新完成')
														}
														deferred.resolve()
													}
												)
											}
										})
									//}else{
									//	_g.log('    下载数据包出错')
									//	node.fs.unlink(tempfile, function(err){
									//		deferred.resolve()
									//	})
									//}
								}).on('error', function(err){
									err_handler(err, '写入文件')
									_g.log('    流程结束')
									//deferred.resolve()
									deferred.reject(new Error(err))
								})
							)
							return deferred.promise
						})
					})(package_name, count)
					count++
				})
				promise_chain_update = promise_chain_update
					.catch(function (err) {
						_g.log(err)
						_g.log('自动更新失败')
						_updater.update_indicator.removeClass('on')
					})
					.done(function(){
						_g.log('')
						if( size_received >= size_total ){
							_g.log('========== ' + updated.length + '/' + updated.length + ' ==========')
							_g.log('')
							_g.log('自动更新完毕')
							_updater.update_indicator.addClass('done').data('tip', '更新完成<br>请重新启动程序')
							_updater.update_indicator_bar.css('width', '')
						}else{
							_g.log('========== ' + updated.length + '/' + updated.length + ' ==========')
							_g.log('')
							_g.log('自动更新失败, 结束流程')
							_updater.update_indicator.removeClass('on')
						}
					})
			})
		
		// 错误处理
			.catch(function (err) {
				_g.log(err)
				_g.log('自动更新失败')
				if( _updater.update_indicator && _updater.update_indicator.length )
					_updater.update_indicator.remove()
			})
			.done(function(){
				_g.log('自动更新过程初始化完毕')
			})
	}


// 将更新流程加入页面序列
	_frame.app_main.functions_on_ready.push( _updater.update )

_tmpl.link_equipment = function( equipment, tagName, returnHTML, improvementStar ){
	if( !equipment )
		return false

	if( tagName && typeof tagName == 'object' )
		return _tmpl.link_equipment(
					equipment,
					tagName['tagName'] || null,
					tagName['returnHTML'] || null,
					typeof tagName['improvementStar'] == 'undefined' ? null : tagName['improvementStar']
				)

	tagName = tagName || 'button'
	returnHTML = returnHTML || false
	improvementStar = typeof improvementStar == 'undefined' ? null : improvementStar

	if( typeof equipment != 'object' ){
		var equipmentId = parseInt(equipment)
		equipment = _g.data.items[equipmentId]
	}else{
		var equipmentId = equipment['id']
	}

	return _tmpl.export(
			'<' + tagName + ' class="link_equipment"'
				+ ' data-equipmentid="' + equipmentId + '"'
				+ ' data-tip-position="right"'
				+ ' data-infos="[[EQUIPMENT::' + equipmentId + ']]"'
				+ ' data-tip="[[EQUIPMENT::' + equipmentId + ']]"'
			+ '>'
				+ '<i style="background-image:url(assets/images/itemicon/'
					+ _g.data.item_types[equipment['type']]['icon']
					+ '.png)"></i>'
				/*
				+ '<i style="background-image:url('
					+ node.path.normalize('assets/images/itemicon/' + _g.data.item_types[equipment['type']]['icon'] + '.png')
					+ ')"></i>'
				*/
				+ '<small>'
					+ equipment['name']['zh_cn'].replace(/（([^（^）]+)）/g, '<small>($1)</small>')
				+ '</small>'
				+ ( improvementStar !== null
					? '<em' + (improvementStar<=0 ? ' class="zero"' : '') + '>+' + improvementStar + '</em>'
					: ''
				)
			+ '</' + tagName + '>',
			returnHTML
		)
}

_tmpl.link_ship = function( ship, tagName, returnHTML ){
	if( !ship )
		return false

	if( tagName && typeof tagName == 'object' )
		return _tmpl.link_ship(
					ship,
					tagName['tagName'] || null,
					tagName['returnHTML'] || null
				)

	tagName = tagName || 'button'
	returnHTML = returnHTML || false

	if( typeof ship != 'object' ){
		var shipId = parseInt(ship)
		ship = _g.data.ships[shipId]
	}else{
		var shipId = ship['id']
	}

	return _tmpl.export(
			'<' + tagName + ' class="link_ship" data-shipid="' + shipId + '" data-infos="[[SHIP::' + shipId + ']]">'
				+ '<img src="' + node.path.normalize(_g.path.pics.ships + '/' + shipId) + '/0.webp"/>'
				+ '<span>'
					+ (ship['type'] ? '<small>' + _g['data']['ship_types'][ship['type']]['full_zh'] + '</small>' : '' )
					+ _g.getName( ship['name'], '・' )
				+ '</span>'
			+ '</' + tagName + '>',
			/*
			`<${tagName} class="unit link_ship" data-shipid="${shipId}" data-infos="[[SHIP::${shipId}]]">
				<img src="${_g.path.pics.ships}/${shipId}/0.webp"/>
				<span>${shipName}</span>
			</${tagName}>`,*/
			returnHTML
		)
}

_frame.app_main.page['ships'] = {}








_frame.app_main.page['ships'].init = function( page ){
	this.tablelist = page.find('.tablelist')
	this.tablelistObj = this.tablelist.data('tablelist')

	page.on('pageon', function(){
		if( !_frame.app_main.page['ships'].tablelistObj )
			_frame.app_main.page['ships'].tablelistObj
				= _frame.app_main.page['ships'].tablelist.data('tablelist')

		if( _frame.app_main.page['ships'].tablelistObj )
			_frame.app_main.page['ships'].tablelistObj.thead_redraw()
	})
}

_frame.app_main.page['equipments'] = {}








_frame.app_main.page['equipments'].init = function( page ){
	this.tablelist = page.find('.tablelist')
	this.tablelistObj = this.tablelist.data('tablelist')

	page.on('pageon', function(){
		if( !_frame.app_main.page['equipments'].tablelistObj )
			_frame.app_main.page['equipments'].tablelistObj
				= _frame.app_main.page['equipments'].tablelist.data('tablelist')

		if( _frame.app_main.page['equipments'].tablelistObj )
			_frame.app_main.page['equipments'].tablelistObj.thead_redraw()
	})
}








_frame.app_main.page['equipments'].gen_helper_equipable_on = function( type_id ){
	var equipable_on = ''
	for( var i in _g.data.item_types[type_id]['equipable_on_type'] ){
		var item_type_id = _g.data.item_types[type_id]['equipable_on_type'][i]
		equipable_on+= '<span>'
							+ _g['data']['ship_types'][item_type_id]['full_zh']
							+ ( parseInt(i) < _g.data.item_types[type_id]['equipable_on_type'].length-1 ? ',&nbsp;' : '' )
						+ '</span>'
	}
	return '<em class="helper" data-tip="<h4 class=item_equipable_on>可装备于</h4>' + equipable_on + '">?</em>'
}

_frame.app_main.page['about'] = {}

_frame.app_main.page['about'].journal_parse = function( raw ){
	var searchRes
		,scrapePtrn = /\[\[([^\:]+)\:([0-9]+)\]\]/gi
		,resultHTML = markdown.toHTML( raw )

	while( (searchRes = scrapePtrn.exec(raw)) !== null ){
		try{
			resultHTML = resultHTML.replace( searchRes[0], _tmpl['link_'+searchRes[1].toLowerCase()](searchRes[2], null, true) )
		}catch(e){}
	}

	return resultHTML
}

_frame.app_main.page['about'].init = function( page ){
	/*
	var latestVersionSection = $('[data-version-app]:first-of-type')
		,latestVersion = latestVersionSection.attr('data-version-app').split('.')
		,latestVersionSub = latestVersion[0] + '.' + latestVersion[1]
	*/
	//$('[data-version-app^="'+latestVersionSub+'"]')

	function addUpdateJournal( updateData ){
		var section = $('<section class="update_journal" data-version-'+updateData['type']+'="'+updateData['version']+'"/>')
						.html(
							'<h3>'
							+ (updateData['type'] == 'app'
								? ''
								: (updateData['type'] == 'app-db' ? 'DB' : updateData['type']).toUpperCase() + ' / ')
							+ updateData['version']
							+ '<small>'+(updateData['date'] ? updateData['date'] : 'WIP')+'</small>'
							+ '</h3>'
						)
						.appendTo(page)
		try{
			$(_frame.app_main.page['about'].journal_parse(updateData['journal'])).appendTo( section )
		}catch(e){
			_g.log(e)
			section.remove()
		}
	}

	var promise_chain 	= Q.fcall(function(){})

	// 开始异步函数链
		promise_chain

	// 获取全部开发中的更新日志
		.then(function(){
			var deferred = Q.defer()
			_db.updates.find({'date': ""}).sort({'date': -1}).exec(function(err, docs){
				for( var i in docs ){
					addUpdateJournal(docs[i])
				}
				deferred.resolve(err)
			})
			return deferred.promise
		})

	// 获取全部已更新的更新日志
		.then(function(){
			var deferred = Q.defer()
			_db.updates.find({$not:{'date':""}}).sort({'date': -1}).exec(function(err, docs){
				for( var i in docs ){
					addUpdateJournal(docs[i])
				}
				deferred.resolve(err)
			})
			return deferred.promise
		})

}

/* 
 */

_frame.infos = {
	// curContent: 			null,			// 当前内容的hashCode

	// lastCurrentPage: null, 		// 进入 infos 框架之前显示的页面
	historyLength: -1,
	historyCurrent: -1,

	contentCache: {},

	getContent: function(type, id){
		if( !this.contentCache[type] )
			this.contentCache[type] = {}

		if( !this.contentCache[type][id] ){
			this.contentCache[type][id] = _p.initDOM( _frame.infos['__' + type]( id ) )
		}

		return this.contentCache[type][id]
	},

	show: function(cont, el, doNotPushHistory){
		var exp			= /^\[\[([^\:]+)\:\:([0-9]+)\]\]$/.exec(cont)
			,infosType 	= null
			,infosId 	= null

		if( exp && exp.length > 2 ){
			infosType = exp[1].toLowerCase()
			infosId = parseInt( exp[2] )
			switch( infosType ){
				case 'item':
				case 'equip':
					infosType = 'equipment'
					break;
			}
		}else{
			return false
		}

		// 如果为相同内容，不运行
			if( this.curContent == infosType + '::' + infosId )
				return _frame.infos.dom.container.children('div:first-child')

		if( !doNotPushHistory ){
		//}else{
			this.historyCurrent++
			this.historyLength = this.historyCurrent
			_frame.app_main.pushState(
				{
					'infos':infosType,
					'id': 	infosId,
					'infosHistoryIndex': _frame.infos.historyCurrent
				},
				null,
				'?infos=' + infosType + '&id=' + infosId
			)
		}

		this.show_func( infosType, infosId, doNotPushHistory )
	},

	//show_func: function(cont, el, history){
	show_func: function(type, id, doNotPushHistory, infosHistoryIndex){
		if( !type || !id )
			return false

		// 如果为相同内容，不运行
			if( this.curContent == type + '::' + id )
				return _frame.infos.dom.container.children('div:first-child')

		type = type.toLowerCase()
		id = parseInt(id)

		var cont = ''

		// 第一次运行，创建相关DOM和变量
			if( !_frame.infos.dom ){
				_frame.infos.dom = {
					'nav': 		$('<div class="infos"/>').appendTo( _frame.dom.nav ),
					'main': 	$('<div class="page infos"/>').appendTo( _frame.dom.main )
				}
				_frame.infos.dom.container = $('<div class="wrapper"/>').appendTo( _frame.infos.dom.main )
				_frame.infos.dom.back = $('<button class="back" icon="arrow-set2-left"/>')
						.on({
							'click': function(){
								_frame.infos.dom.forward.removeClass('disabled')
								history.back()
								//_frame.infos.hide()
							},
							'transitionend.infos_hide': function(e){
								if( e.currentTarget == e.target
									&& e.originalEvent.propertyName == 'opacity'
									&& parseInt(_frame.infos.dom.back.css('opacity')) == 0
								){
									_frame.infos.hide_finish()
								}
							}
						}).appendTo( _frame.infos.dom.nav )
				_frame.infos.dom.forward = $('<button class="forward disabled" icon="arrow-set2-right"/>')
						.on('click', function(){
							history.forward()
							//_frame.infos.hide()
						}).appendTo( _frame.infos.dom.nav )
				/*
				_frame.infos.dom.historyback = $('<button class="history"/>')
						.html('')
						.on('click', function(){
							_frame.infos.historyback()
						}).appendTo( _frame.infos.dom.nav )
				*/
			}

		// 计算历史记录相关，确定 Back/Forward 按钮是否可用
			infosHistoryIndex = typeof infosHistoryIndex != 'undefined' ? infosHistoryIndex : this.historyCurrent
			this.historyCurrent = infosHistoryIndex
			//_g.log( this.historyCurrent, this.historyLength )
			if( this.historyCurrent == this.historyLength && this.historyCurrent > -1 )
				_frame.infos.dom.forward.addClass('disabled')

		// 先将内容区域设定为可见
			_frame.dom.layout.addClass('infos-show')

		// 处理内容
			switch(type){
				case 'ship':
					cont = this.getContent(type, id)
					_frame.infos.dom.main.attr('data-infostype', 'shipinfo')
					break;
				case 'equipment':
					cont = this.getContent(type, id)
					_frame.infos.dom.main.attr('data-infostype', 'equipmentinfo')
					break;
			}
			var hashcode = (cont.append) ? cont[0].outerHTML.hashCode() : cont.hashCode()
			//if( _frame.infos.curContent != hashcode ){
				var contentDOM = cont.append ? cont : $(cont)

				//if( el && el.attr('data-infos-history-skip-this') )
				//	contentDOM.attr('data-infos-history-skip-this', true)

				//if( _frame.infos.dom.main.children().length )
				//	contentDOM.addClass('fadein')

				/*
				if( history ){
					_frame.infos.dom.main.children().filter('[data-infos-history-skip-this="true"]').remove()
					_frame.infos.dom.main.children().slice(2).remove()
					_frame.infos.dom.main.children().eq(0).addClass('off')
					_frame.infos.dom.historyback.html(history).addClass('show')
				}else{
					_frame.infos.dom.historyback.html('').removeClass('show')
					_frame.infos.dom.main.empty()
				}*/
				//data-infos-history-skip-this

				contentDOM
					.on('transitionend.hide', function(e){
						if( e.currentTarget == e.target && e.originalEvent.propertyName == 'opacity' && parseInt(contentDOM.css('opacity')) == 0 ){
							contentDOM.detach()
						}
					})
					.prependTo( _frame.infos.dom.container )

				//_p.initDOM( contentDOM )
				//_frame.infos.curContent = hashcode
				this.curContent = type + '::' + id
			//}

		// 取消主导航上的当前项目状态
			if( _frame.app_main.cur_page ){
				this.lastCurrentPage = _frame.app_main.cur_page
				_frame.dom.navs[_frame.app_main.cur_page].removeClass('on')
				_frame.app_main.cur_page = null
			}

		setTimeout(function(){
			// 显示内容
				_frame.dom.layout.addClass('infos-on')
		}, 1)
	},

	hide: function(){
		if( !_frame.infos.dom || !this.curContent )
			return false

		// 隐藏内容
			_frame.dom.layout.removeClass('infos-on')
			_frame.infos.dom.forward.addClass('disabled')
			this.curContent = null

		if( this.lastCurrentPage ){
			_frame.dom.navs[this.lastCurrentPage].addClass('on')
			_frame.app_main.cur_page = this.lastCurrentPage
		}

		/*
		// 为主导航最后一个元素绑定 transitionEnd 事件
		// transitionEnd 触发后，检查 top CSS，如果为 0，判断动画播放结束
		// 将内容区域设定为不可见
			_frame.dom.navlinks.children('button:last-of-type')
					.on('transitionend.infos_hide', function(e){
						if( e.currentTarget == e.target && e.originalEvent.propertyName == 'top' && parseInt($(this).css('top')) == 0 ){
							_frame.dom.layout.removeClass('infos-show')
							_frame.infos.dom.main.attr('data-infostype', '')
							$(this).off('transitionend.infos_hide')
						}
					})
		*/
	},

	hide_finish: function(){
		// 仍在显示，不予执行
			if( _frame.infos.curContent )
				return false

		_frame.dom.layout.removeClass('infos-show')
		_frame.infos.dom.main.attr('data-infostype', '')
		//$(this).off('transitionend.infos_hide')
		this.historyLength = -1
		this.historyCurrent = -1
	},

	historyback: function(){
		_frame.infos.dom.main.children().slice(1).remove()
		_frame.infos.dom.main.children().eq(0).removeClass('off').addClass('fadein')
		_frame.infos.dom.historyback.empty().removeClass('show')

		if( _frame.infos.dom.main.children().eq(0).hasClass('ship') )
			_frame.infos.dom.main.attr('data-infostype', 'shipinfo')
		else if( _frame.infos.dom.main.children().eq(0).hasClass('equipment') )
			_frame.infos.dom.main.attr('data-infostype', 'equipmentinfo')
	}
}







// 初始化
_frame.infos.init = function(){
	if( _frame.infos.is_init )
		return true

	$body.on( 'click._infos', '[data-infos]', function(e){
			if( !(e.target.tagName.toLowerCase() == 'input' && e.target.className == 'compare') ){
				var el = $(this)
				_frame.infos.show(
					el.attr('data-infos'),
					el,
					el.attr('data-infos-nohistory')
				)
			}
		})

	_frame.infos.is_init = true
	return true
}














// 特殊内容

	// 舰娘信息
		_frame.infos.__ship = function( id ){
			var d = _g.data.ships[ id ]

			_g.log(d)

			function _val( val, show_zero ){
				if( !show_zero && (val == 0 || val == '0') )
					return '<small class="zero">-</small>'
				if( val == -1 || val == '-1' )
					return '<small class="zero">?</small>'
				return val
			}
			function _add_stat( name, title, tar ){
				var val99 = 0
					,val150 = null

				function getStatOfLvl( lvl, base, max ){
					if( base < 0 || max < 0 )
						return -1
					return Math.floor( base + (max - base) * lvl / 99 )
				}

				switch( name ){
					case 'hp':
						val99 = _val( d['stat']['hp'] )
						if (d['stat']['hp'] >= 90) val150 = d['stat']['hp'] + 9
						else if (d['stat']['hp'] >= 70) val150 = d['stat']['hp'] + 8
						else if (d['stat']['hp'] >= 50) val150 = d['stat']['hp'] + 7
						else if (d['stat']['hp'] >= 40) val150 = d['stat']['hp'] + 6
						else if (d['stat']['hp'] >= 30) val150 = d['stat']['hp'] + 5
						else val150 = d['stat']['hp'] + 4
						if (val150 > d['stat']['hp_max']) val150 = d['stat']['hp_max']
						break;
					case 'asw':
						val99 = _val( getStatOfLvl( 99, d['stat']['asw'], d['stat']['asw_max'] ), /^(5|8|9|12|24)$/.test(d['type']) )
						val150 = _val( getStatOfLvl( 150, d['stat']['asw'], d['stat']['asw_max'] ), /^(5|8|9|12|24)$/.test(d['type']) )
						break;
					case 'evasion':
					case 'los':
						val99 = _val( getStatOfLvl( 99, d['stat'][name], d['stat'][name + '_max'] ) )
						val150 = _val( getStatOfLvl( 150, d['stat'][name], d['stat'][name + '_max'] ) )
						break;
					case 'speed':
						val99 = _g.getStatSpeed( d['stat']['speed'] )
						break;
					case 'range':
						val99 = _g.getStatRange( d['stat']['range'] )
						break;
					case 'luck':
						val99 = d['stat']['luck'] + '<sup>' + d['stat']['luck_max'] + '</sup>'
						val150 = (d['stat']['luck'] + 3) + '<sup>' + d['stat']['luck_max'] + '</sup>'
						break;
					case 'fuel':
					case 'ammo':
						val99 = _val( d['consum'][name] )
						val150 = _val( Math.floor( d['consum'][name] * 0.85 ) )
						break;
					default:
						val99 = _val( d['stat'][name + '_max'] || d['stat'][name] )
						break;
				}

				$('<span/>')
					.html(
						'<small class="stat-'+name+'">' + title + '</small>'
						+ '<em'+( val150 ? ' class="lvl99"' : '' )+'>' + val99 + '</em>'
						+ ( val150 ? '<em class="lvl150">' + val150 + '</em>' : '' )
						//+ '<em class="lvl99'+( !val150 ? ' lvl150' : '' )+'">' + val99 + '</em>'
						//+ ( val150 ? '<em class="lvl150">' + val150 + '</em>' : '' )
					)
					.appendTo(tar)
			}

			//_frame.modal.resetContent()

			var dom = $('<div class="ship"/>')
				,ship_name = _g.getName( d['name'], '・' ) || '舰娘'
				,illustrations = []

			// 名称 & 舰种 & 舰级
				$('<div class="title"/>')
					.html(
						'<h2 data-content="' + ship_name + '">' + ship_name + '</h2>'
						+ '<small>'
							+ ( d['class'] ? _g['data']['ship_classes'][d['class']]['name_zh'] + '级' : '' )
							+ ( d['class_no'] ? '<em>' + d['class_no'] + '</em>号舰' : '' )
							+ ( d['type'] ? ' / ' + _g['data']['ship_types'][d['type']]['full_zh'] : '' )
						+ '</small>'
					).appendTo(dom)

			// 属性
				var lvlRadio99_id = '_input_g' + parseInt(_g.inputIndex)
					,lvlRadio150_id = '_input_g' + (parseInt(_g.inputIndex) + 1)
					,curLvl = parseInt(_config.get('ship_infos_lvl') || 99)
					,stats = $('<div class="stats"/>')
								.html(
									'<div class="title">'
										+ '<h4 data-content="基础属性">基础属性</h4>'
										+ '<span>'
											+ '<label for="'+lvlRadio99_id+'" class="lvl99">99</label>'
											+ '<label for="'+lvlRadio150_id+'" class="lvl150">150</label>'
										+ '</span>'
									+ '</div>'
								)
								.prepend(
									$('<input type="radio" name="ship_infos_lvl_'+id+'" id="'+lvlRadio99_id+'" value="99"/>')
										.prop('checked', curLvl == 99)
										.on('change', function(){
											_config.set('ship_infos_lvl', $(this).val())
										})
								)
								.prepend(
									$('<input type="radio" name="ship_infos_lvl_'+id+'" id="'+lvlRadio150_id+'" value="150"/>')
										.prop('checked', curLvl == 150)
										.on('change', function(){
											_config.set('ship_infos_lvl', $(this).val())
										})
								)
								.appendTo(dom)
					,stat1 = $('<div class="stat"/>').appendTo(stats)
					,stat2 = $('<div class="stat"/>').appendTo(stats)
					,stat3 = $('<div class="stat"/>').appendTo(stats)
					,stat_consum = $('<div class="stat consum"/>').appendTo(stats)

				_g.inputIndex+=2

				_add_stat( 'hp', 		'耐久',	stat1 )
				_add_stat( 'armor', 	'装甲',	stat1 )
				_add_stat( 'evasion', 	'回避',	stat1 )
				_add_stat( 'carry', 	'搭载',	stat1 )

				_add_stat( 'fire', 		'火力',	stat2 )
				_add_stat( 'torpedo', 	'雷装',	stat2 )
				_add_stat( 'aa', 		'对空',	stat2 )
				_add_stat( 'asw', 		'对潜',	stat2 )

				_add_stat( 'speed', 	'航速',	stat3 )
				_add_stat( 'range', 	'射程',	stat3 )
				_add_stat( 'los', 		'索敌',	stat3 )
				_add_stat( 'luck', 		'运',	stat3 )

				_add_stat( 'fuel', 		'油耗',	stat_consum )
				_add_stat( 'ammo', 		'弹耗',	stat_consum )

			// 初始装备 & 搭载量
				var equips = $('<div class="equipments"/>').html('<h4 data-content="初始装备 & 搭载量">初始装备 & 搭载量</h4>').appendTo(dom)
					,i = 0
				while( i < 4 ){
					var equip = $('<button/>').appendTo(equips)
						,icon = $('<i/>').appendTo( equip )
						,name = $('<small/>').appendTo( equip )
						,slot = $('<em/>').appendTo( equip )

					if( typeof d['slot'][i] == 'undefined' ){
						equip.addClass('no')
					}else if( typeof d['equip'][i] == 'undefined' || !d['equip'][i] || d['equip'][i] === '' ){
						equip.addClass('empty')
						name.html( '--未装备--' )
						slot.html( d['slot'][i] )
					}else{
						var item_data = _g.data.items[d['equip'][i]]
							,item_icon = 'assets/images/itemicon/'
											+ _g.data.item_types[item_data['type']]['icon']
											+ '.png'
						equip.attr({
							'data-equipmentid': 	d['equip'][i],
							'data-tip-position': 	'left',
							'data-infos': 			'[[EQUIPMENT::'+d['equip'][i]+']]',
							'data-tip':				'[[EQUIPMENT::'+d['equip'][i]+']]'
						})
						name.html(
							item_data['name']['zh_cn'].replace(/（([^（^）]+)）/g, '<small>($1)</small>')
						)
						slot.html( d['slot'][i] )
						icon.css(
							'background-image',
							'url(' + item_icon + ')'
						)
					}
					i++
				}

			// 声优 & 画师 & 消耗
				$('<span class="entity"/>')
					.html(
						'<strong>声优</strong>'
						+ '<span>' + ( d['rels']['cv']
							? _g['data']['entities'][d['rels']['cv']]['name'][_g.lang]
							: '?' ) + '</span>'
					)
					.appendTo(dom)
				$('<span class="entity"/>')
					.html(
						'<strong>画师</strong>'
						+ '<span>' + ( d['rels']['illustrator']
							? _g['data']['entities'][d['rels']['illustrator']]['name'][_g.lang]
							: '?' ) + '</span>'
					)
					.appendTo(dom)
					/*
				var consum = $('<span class="consum"/>').html('<strong>消耗</strong>').appendTo(dom)
				_add_stat( 'fuel', 		'', _val( d['consum']['fuel'] ),		consum )
				_add_stat( 'ammo', 		'', _val( d['consum']['ammo'] ),		consum )
				*/

			// 改造信息
				var remodels = $('<div class="remodels"/>').html('<h4 data-content="改造">改造</h4>').appendTo(dom)
					,remodels_container = _p.el.flexgrid.create().appendTo( remodels )
				if( d['series'] ){
					_db.ship_series.find({'id': d['series']}, function(err,docs){
						if( !err && docs && docs.length ){
							// 遍历 docs[0].ships
								for(var i in docs[0].ships){
									var _i = parseInt(i)
										,remodel_ship_data = _g.data.ships[docs[0].ships[i]['id']]
										,remodel_ship_name = remodel_ship_data['name']['zh_cn']
														+ (remodel_ship_data['name']['suffix']
															? '・' + _g.data.ship_namesuffix[remodel_ship_data['name']['suffix']]['zh_cn']
															: '')
										,tip = '<h3 class="shipinfo">'
													+ '<strong data-content="' + remodel_ship_name + '">'
														+ remodel_ship_name
													+ '</strong>'
													+ (
														remodel_ship_data['type'] ?
															'<small>' + _g['data']['ship_types'][remodel_ship_data['type']]['full_zh'] + '</span>'
															: ''
													)
												+ '</h3>'
										,remodel_lvl = _i ? docs[0].ships[ _i - 1 ]['next_lvl'] : null
										,remodel_blueprint = _i ? (docs[0].ships[ _i - 1 ]['next_blueprint']) : null

									remodels_container.appendDOM(
										$('<button class="unit" data-shipid="'+ docs[0].ships[i]['id'] +'"/>')
											.attr({
												'data-infos': 	'[[SHIP::'+ docs[0].ships[i]['id'] +']]',
												'data-tip': 	tip,
												'data-infos-nohistory': true
											})
											.addClass(docs[0].ships[i]['id'] == d['id'] ? 'on' : '')
											.addClass(remodel_blueprint ? 'blueprint' : '')
											.html(
												'<i><img src="' + _g.path.pics.ships + '/' + docs[0].ships[i]['id']+'/0.webp"/></i>'
												+ (remodel_lvl ? '<strong>' + remodel_lvl + '</strong>' : '')
											)
									)

									// 处理图鉴信息
										if( docs[0].ships[i]['id'] == d['id'] ){
											if( docs[0].ships[i].illust_delete ){
												if( _i ){
													illustrations.push( docs[0].ships[_i - 1]['id'] )
													if( docs[0].ships[_i - 1].illust_extra && docs[0].ships[_i - 1].illust_extra.length && docs[0].ships[_i - 1].illust_extra[0] ){
														//illustrations = illustrations.concat('extra_'+docs[0].ships[_i - 1].illust_extra)
														for( var j in docs[0].ships[_i - 1].illust_extra ){
															illustrations.push( 'extra_' + docs[0].ships[_i - 1].illust_extra[j] )
														}
													}
												}
											}else{
												illustrations.push( docs[0].ships[i]['id'] )
												if( docs[0].ships[i].illust_extra && docs[0].ships[i].illust_extra.length && docs[0].ships[i].illust_extra[0] ){
													for( var j in docs[0].ships[i].illust_extra ){
														illustrations.push( 'extra_' + docs[0].ships[i].illust_extra[j] )
													}
													//illustrations = illustrations.concat('extra_'+docs[0].ships[i].illust_extra)
												}
											}
										}
								}
								var index = 0
								function check_append( file ){
									file = file.replace(/\\/g, '/')
									try{
										var stat = node.fs.lstatSync(file)
										if( stat && stat.isFile() ){
											index++
											$('<input type="radio" name="ship_'+d['id']+'_illustrations" value="'+index+'"/>')
												.prop('checked', (index == 1))
												.insertBefore(illusts_container)
											$('<span class="container"/>')
												.html('<img src="'+file+'" data-filename="'+ship_name+' - '+index+'.webp"/>')
												//.css('background-image', 'url(' + file + ')')
												.appendTo(illusts_container)
										}
									}catch(e){}
								}
								for( var i in illustrations ){
									//if( i )
									//	check_append( _g.path.pics.ships + '/' + illustrations[i] + '/2.jpg' )
									check_append( _g.path.pics.ships + '/' + illustrations[i] + '/8.webp' )
									check_append( _g.path.pics.ships + '/' + illustrations[i] + '/9.webp' )
								}
						}
					})
				}

			// 图鉴
				// illustrations
				var illusts = $('<aside class="illustrations"/>').appendTo(dom)
					,illusts_container = $('<div/>').appendTo(illusts)

			return dom
			/*
			// 按钮
				var buttons = $('<div class="buttons"/>').appendTo(dom)

			_frame.modal.show(
				dom,
				_g.getName( d['name'], '・' ) || '舰娘',
				{
					'classname': 		'infos',
					'blank_to_close': 	true
				}
			)
			*/
		}

	// 装备信息
		_frame.infos.__equipment = function( id ){
			var d = _g.data.items[ id ]

			_g.log(d)

			function _stat(stat, title){
				if( d['stat'][stat] ){
					var html = '<small class="stat-'+stat+'">' + title + '</small>'
					switch(stat){
						case 'range':
							html+= '<em>' + _g.getStatRange( d['stat'][stat] ) + '</em>';
							break;
						default:
							var val = parseInt( d['stat'][stat] )
							html+= '<em'+ (val < 0 ? ' class="negative"' : '') +'>' + ( val > 0 ? '+' : '') + val + '</em>'
							break;
					}
					$('<span/>').html(html).appendTo(stat_container)
				}//else{
				//	return ''
				//}
			}

			var dom = $('<div class="equipment"/>')

			// 名称 & 类型
				$('<div class="title"/>')
					.html(
						'<h2 data-content="' + d['name']['zh_cn'] + '">' + d['name']['zh_cn'] + '</h2>'
						+ '<small>'
							+ ( d['type']
								? ( _g['data']['item_types'][d['type']]['name']['zh_cn']
									+ _frame.app_main.page['equipments'].gen_helper_equipable_on( d['type'] )
								): '' )
						+ '</small>'
					).appendTo(dom)

			// 属性
				var stats = $('<div class="stats"/>')
								.html('<h4 data-content="属性">属性</h4>')
								.appendTo(dom)
					,stat_container = $('<div class="stat"/>').appendTo(stats)

				_stat('fire', '火力')
				_stat('torpedo', '雷装')
				_stat('aa', '对空')
				_stat('asw', '对潜')
				_stat('bomb', '爆装')
				_stat('hit', '命中')
				_stat('armor', '装甲')
				_stat('evasion', '回避')
				_stat('los', '索敌')
				_stat('range', '射程')

			// 开发 & 改修
				var arsenal = $('<div class="stats"/>')
								.html('<h4 data-content="开发改修">开发改修</h4>')
								.appendTo(dom)
					,arsenal1 = $('<div class="stat"/>').appendTo(arsenal)

				$('<span/>')
					.append(
						$('<small class="indicator">')
							.addClass( d['craftable'] ? 'true' : 'false' )
							.html( d['craftable'] ? '可开发' : '不可开发' )
					)
					.appendTo( arsenal1 )
				$('<span/>')
					.append(
						$('<small class="indicator">')
							.addClass( d['improvable'] ? 'true' : 'false' )
							.html( d['improvable'] ? '可改修' : '不可改修' )
					)
					.appendTo( arsenal1 )
				if( d['improvable'] && !(d['upgrade_to'] && d['upgrade_to'].push && d['upgrade_to'].length) ){
					$('<span/>').html('<small class="indicator false">不可升级</small>')
						.appendTo( arsenal1 )
				}

				// 可升级为
					if( d['upgrade_to'] && d['upgrade_to'].push && d['upgrade_to'].length ){
						var arsenal_to = $('<div class="stat upgrade"/>')
								.html('<span><small class="indicator true">可升级为</small></span>')
								.appendTo(arsenal)
						for( var i in d['upgrade_to'] ){
							_tmpl.link_equipment(d['upgrade_to'][i][0], null, null, d['upgrade_to'][i][1]).appendTo( arsenal_to )
						}
					}

			// 升级来源
				if( d['upgrade_from'] && d['upgrade_from'].push && d['upgrade_from'].length ){
					var upgrade_from = $('<div class="stats"/>')
									.html('<h4 data-content="可由以下装备升级获得">可由以下装备升级获得</h4>')
									.appendTo(dom)
						,upgrade_from1 = $('<div class="stat upgrade"/>')
							.appendTo(upgrade_from)
					for( var i in d['upgrade_from'] ){
						_tmpl.link_equipment(d['upgrade_from'][i]).appendTo( upgrade_from1 )
					}
				}

			// 初始装备于
				var equipped = $('<div class="equipped"/>').html('<h4 data-content="初始装备于">初始装备于</h4>').appendTo(dom)
					,equipped_container = _p.el.flexgrid.create().appendTo( equipped )
				if( d.default_equipped_on && d.default_equipped_on.length ){
					for( var i in d.default_equipped_on ){
						equipped_container.appendDOM(
							_tmpl.link_ship(d.default_equipped_on[i]).addClass('unit')
						)
					}
				}else{
					equipped_container.addClass('no').html('暂无初始配置该装备的舰娘...')
				}

			// 图鉴
				var illusts = $('<aside class="illustrations"/>').appendTo(dom)
				try{
					var file = _g.path.pics.items + '/' + d['id'] + '/card.webp'
						,stat = node.fs.lstatSync(file)
					if( stat && stat.isFile() ){
						$('<img src="'+file+'" data-filename="'+d['name']['zh_cn']+'.webp"/>')
							.appendTo(illusts)
					}
				}catch(e){}

			return dom
		}

if( typeof _p.tip != 'undefined' ){

_p.tip.filters.push( function(cont){
	var exp = /^\[\[EQUIPMENT\:\:([0-9]+)\]\]$/.exec(cont)
	if( exp && exp.length > 1 )
		return _p.tip.content_equipment( _g.data.items[ parseInt(exp[1]) ] )
} )

_p.tip.content_equipment = function( d ){

	function _stat(stat, title){
		if( d['stat'][stat] ){
			switch(stat){
				case 'range':
					return '<span>射程: ' + _g.getStatRange( d['stat'][stat] ) + '</span>';
					break;
				default:
					var val = parseInt( d['stat'][stat] )
					return '<span>' + ( val > 0 ? '+' : '') + val + ' ' + title + '</span>'
					break;
			}
		}else{
			return ''
		}
	}

	var item_icon = 'assets/images/itemicon/'
						+ _g.data.item_types[d['type']]['icon']
						+ '.png'
		,html = '<h3 class="itemstat">'
					+ '<s style="background-image: url(' + item_icon + ')"></s>'
					+ '<strong data-content="' + d['name']['zh_cn'] + '">'
						+ d['name']['zh_cn']
					+ '</strong>'
					+ '<small>' + _g.data.item_types[d['type']]['name']['zh_cn'] + '</small>'
				+ '</h3>'
				+ _stat('fire', '火力')
				+ _stat('torpedo', '雷装')
				+ _stat('aa', '对空')
				+ _stat('asw', '对潜')
				+ _stat('bomb', '爆装')
				+ _stat('hit', '命中')
				+ _stat('armor', '装甲')
				+ _stat('evasion', '回避')
				+ _stat('los', '索敌')
				+ _stat('range', '射程')

	return html

}}

/*
 */
_p.el.tablelist = {
	init_el: function(el){
		if( el.data('tablelist') )
			return true

		el.data({
			'tablelist': new _tablelist( el )
		})
	},

	init: function(tar, els){
		tar = tar || $body;
		els = els || tar.find('.tablelist')

		els.each(function(){
			_p.el.tablelist.init_el($(this))
		})
	}
}






var _tablelist = function( container, options ){
	this.dom = {
		'container': 	container
	}

	if( container.hasClass('ships') )
		this.listtype = 'ships'
	else if( container.hasClass('equipments') )
		this.listtype = 'equipments'

	this._index = this.global_index
	this.global_index++

	this.init();
}

_tablelist.prototype.global_index = 0
_tablelist.prototype.flexgrid_empty_count = 6
_tablelist.prototype.sort_data_by_stat = {}












// Ships
	_tablelist.prototype._ships_columns = [
		'  ',
		['火力',	'fire'],
		['雷装',	'torpedo'],
		['夜战',	'nightpower'],
		['对空',	'aa'],
		['对潜',	'asw'],
		['耐久',	'hp'],
		['装甲',	'armor'],
		['回避',	'evasion'],
		['搭载',	'carry'],
		['航速',	'speed'],
		['射程',	'range'],
		['索敌',	'los'],
		['运',		'luck'],
		['油耗',	'consum_fuel'],
		['弹耗',	'consum_ammo']
	]
	_tablelist.prototype._ships_header_checkbox = []
	_tablelist.prototype._ships_last_item = null
	_tablelist.prototype._ships_append_item = function( ship_data, header_index ){
		var self = this
			//,tr = $('<tr class="row" data-shipid="'+ ship_data['id'] +'" data-header="'+ header_index +'" modal="true"/>')
			//,tr = $('<tr class="row" data-shipid="'+ ship_data['id'] +'" data-header="'+ header_index +'" data-infos="__ship__"/>')
			,donotcompare = _g.data.ship_types[ship_data['type']]['donotcompare'] ? true : false
			,tr = $('<tr class="row" data-shipid="'+ ship_data['id'] +'" data-header="'+ header_index +'" data-trindex="'+self.trIndex+'"/>')
					.attr({
						'data-infos': 	'[[SHIP::'+ship_data['id']+']]',
						'data-shipedit':self.dom.container.hasClass('shiplist-edit') ? 'true' : null,
						'data-donotcompare': donotcompare ? true : null
					})
					//.appendTo( this.dom.tbody )
					.insertAfter( self._ships_last_item )
			,max_carry = 0
			,name = ship_data['name']['zh_cn']
					+ (ship_data['name']['suffix']
						? '<small>' + _g.data.ship_namesuffix[ship_data['name']['suffix']]['zh_cn'] + '</small>'
						: '')
			,checkbox = $('<input type="checkbox" class="compare"/>')
							.prop('disabled', donotcompare)
							.on('click, change',function(e, not_trigger_check){
								if( $(this).prop('checked') )
									tr.attr('compare-checked', true )
								else
									tr.removeAttr('compare-checked')
								self._ships_compare_btn_show( $(this).prop('checked') )
								if( !not_trigger_check )
									self._ships_header_checkbox[header_index].trigger('docheck')
							})

		self._ships_last_item = tr
		self.trIndex++

		self._ships_header_checkbox[header_index].data(
				'ships', 
				self._ships_header_checkbox[header_index].data('ships').add( tr )
			)
		tr.data('checkbox', checkbox)

		for( var i in ship_data['carry'] ){
			max_carry+= ship_data['carry'][i]
		}

		function _val( val, show_zero ){
			if( !show_zero && (val == 0 || val == '0') )
				return '<small class="zero">-</small>'
			if( val == -1 || val == '-1' )
				return '<small class="zero">?</small>'
			return val
		}

		for( var i in self._ships_columns ){
			switch( self._ships_columns[i][1] ){
				case ' ':
					$('<th/>')
						.html(
							//'<img src="../pics/ships/'+ship_data['id']+'/0.jpg"/>'
							'<img src="' + _g.path.pics.ships + '/' + ship_data['id']+'/0.webp" contextmenu="disabled"/>'
							+ '<strong>' + name + '</strong>'
							//+ '<small>' + ship_data['pron'] + '</small>'
						)
						.prepend(
							checkbox
						)
						.appendTo(tr)
					break;
				case 'nightpower':
					// 航母没有夜战火力
					var datavalue = /^(9|10|11)$/.test( ship_data['type'] )
									? 0
									: (parseInt(ship_data['stat']['fire_max'] || 0)
										+ parseInt(ship_data['stat']['torpedo_max'] || 0) )
					$('<td data-stat="nightpower"/>')
						.attr(
							'data-value',
							datavalue == -1 || datavalue == '-1'
								? null
								: datavalue
						)
						.html( _val( datavalue ) )
						.appendTo(tr)
					break;
				case 'asw':
					$('<td data-stat="asw" />')
						.attr(
							'data-value',
							ship_data['stat']['asw_max'] == -1 || ship_data['stat']['asw_max'] == '-1'
								? null
								: ship_data['stat']['asw_max']
						)
						.html( _val(
							ship_data['stat']['asw_max'],
							/^(5|8|9|12|24)$/.test( ship_data['type'] )
						) )
						.appendTo(tr)
					break;
				case 'hp':
					$('<td data-stat="hp" data-value="' + ship_data['stat']['hp'] + '"/>')
						.html(_val( ship_data['stat']['hp'] ))
						.appendTo(tr)
					break;
				case 'carry':
					$('<td data-stat="carry" data-value="' + ship_data['stat']['carry'] + '"/>')
						.html(_val( ship_data['stat']['carry'] ))
						.appendTo(tr)
					break;
				case 'speed':
					$('<td data-stat="speed" data-value="' + ship_data['stat']['speed'] + '"/>')
						.html( _g.getStatSpeed( ship_data['stat']['speed'] ) )
						.appendTo(tr)
					break;
				case 'range':
					$('<td data-stat="range" data-value="' + ship_data['stat']['range'] + '"/>')
						.html( _g.getStatRange( ship_data['stat']['range'] ) )
						.appendTo(tr)
					break;
				case 'luck':
					$('<td data-stat="luck" data-value="' + ship_data['stat']['luck'] + '"/>')
						.html(ship_data['stat']['luck'] + '<sup>' + ship_data['stat']['luck_max'] + '</sup>')
						.appendTo(tr)
					break;
				case 'consum_fuel':
					$('<td data-stat="consum_fuel"/>')
						.attr(
							'data-value',
							ship_data['consum']['fuel'] == -1 || ship_data['consum']['fuel'] == '-1'
								? null
								: ship_data['consum']['fuel']
						)
						.html( _val(ship_data['consum']['fuel']) )
						.appendTo(tr)
					break;
				case 'consum_ammo':
					$('<td data-stat="consum_ammo"/>')
						.attr(
							'data-value',
							ship_data['consum']['ammo'] == -1 || ship_data['consum']['ammo'] == '-1'
								? null
								: ship_data['consum']['ammo']
						)
						.html( _val(ship_data['consum']['ammo']) )
						.appendTo(tr)
					break;
				default:
					var datavalue = ship_data['stat'][self._ships_columns[i][1] + '_max']
					$('<td data-stat="'+self._ships_columns[i][1]+'"/>')
						.attr(
							'data-value',
							datavalue == -1 || datavalue == '-1'
								? -1
								: datavalue
						)
						.html( _val( datavalue ) )
						.appendTo(tr)
					break;
			}
		}

		// 检查数据是否存在 remodel_next
		// 如果 remodel_next 与当前数据 type & name 相同，标记当前为可改造前版本
		if( ship_data.remodel_next
			&& _g.data.ships[ ship_data.remodel_next ]
			&& _g.ship_type_order_map[ship_data['type']] == _g.ship_type_order_map[_g.data.ships[ ship_data.remodel_next ]['type']]
			&& ship_data['name']['ja_jp'] == _g.data.ships[ ship_data.remodel_next ]['name']['ja_jp']
		){
			tr.addClass('premodeled')
		}

		return tr
	}
	_tablelist.prototype._ships_append_all_items = function(){
		var self = this
		function _do( i, j ){
			if( _g.data.ship_id_by_type[i] ){
				if( !j ){
					if( typeof _g.ship_type_order[i] == 'object' ){
						var data_shiptype = _g.data.ship_types[ _g.ship_type_order[i][0] ]
					}else{
						var data_shiptype = _g.data.ship_types[ _g.ship_type_order[i] ]
					}

					var checkbox_id = '_input_g' + parseInt(_g.inputIndex)
					self._ships_last_item = 
							$('<tr class="typetitle" data-trindex="'+self.trIndex+'">'
								+ '<th colspan="' + (self._ships_columns.length + 1) + '">'
								+ '<label for="' + checkbox_id + '">'
								//+ data_shiptype['full_zh']
								//+ _g.data['ship_type_order'][i+1]['name']['zh_cn']
								+ _g.data['ship_type_order'][i]['name']['zh_cn']
								//+ ( _g.data['ship_type_order'][i+1]['name']['zh_cn'] == data_shiptype['full_zh']
								+ ( _g.data['ship_type_order'][i]['name']['zh_cn'] == data_shiptype['full_zh']
									? ('<small>[' + data_shiptype['code'] + ']</small>')
									: ''
								)
								+ '</label></th></tr>')
								.appendTo( self.dom.tbody )
					self.trIndex++

					// 创建空DOM，欺骗flexbox layout排版
						var k = 0
						while(k < self.flexgrid_empty_count){
							var _index = self.trIndex + _g.data.ship_id_by_type[i].length + k
							$('<tr class="empty" data-trindex="'+_index+'"/>').appendTo(self.dom.tbody)
							k++
						}

					self._ships_header_checkbox[i]
						= $('<input type="checkbox" id="' + checkbox_id + '"/>')
							//.prop('disabled', _g.data['ship_type_order'][i+1]['donotcompare'] ? true : false)
							.prop('disabled', _g.data['ship_type_order'][i]['donotcompare'] ? true : false)
							.on({
								'change': function(){
									var _checkbox = $(this)
									_checkbox.data('ships').filter(':visible').each(function(){
										$(this).data('checkbox').prop('checked', _checkbox.prop('checked')).trigger('change', [true])
									})
								},
								'docheck': function(){
									// ATTR: compare-checked
									var trs = $(this).data('ships').filter(':visible')
										,checked = trs.filter('[compare-checked=true]')
									if( !checked.length ){
										$(this).prop({
											'checked': 			false,
											'indeterminate': 	false
										})
									}else if( checked.length < trs.length ){
										$(this).prop({
											'checked': 			false,
											'indeterminate': 	true
										})
									}else{
										$(this).prop({
											'checked': 			true,
											'indeterminate': 	false
										})
									}
								}
							})
							.data('ships', $())
							.prependTo( self._ships_last_item.find('th') )

					_g.inputIndex++
				}

				self._ships_append_item( _g.data.ships[ _g.data.ship_id_by_type[i][j] ], i )

				setTimeout(function(){
					if( j >= _g.data.ship_id_by_type[i].length - 1 ){
						self.trIndex+= self.flexgrid_empty_count
						_do( i+1, 0 )
					}else{
						_do( i, j+1 )
					}
				}, 0)
			}else{
				self.mark_high()
				self.thead_redraw()
				_frame.app_main.loaded('tablelist_'+self._index, true)
				//_g.log( self._ships_last_item )
				delete( self._ships_last_item )
				//_g.log( self._ships_last_item )
			}
		}
		_do( 0, 0 )
	}
	_tablelist.prototype._ships_compare_btn_show = function( is_checked ){
		if( (!is_checked && this.dom.tbody.find('input[type="checkbox"].compare:checked').length)
			|| is_checked
		){
			this.dom.msg_container.attr('data-msgs', 'comparestart')
		}else{
			this.dom.msg_container.removeAttr('data-msgs')
		}
	}
	_tablelist.prototype._ships_compare_start = function(){
		// 隐藏底部提示信息
			this.dom.msg_container.removeAttr('data-msgs')

		// 存储当前状态
			this._ships_last_viewtype = this.dom.filter_container.attr('viewtype')
			_config.set( 'shiplist-viewtype', this._ships_last_viewtype )
			this._ships_last_scrollTop = this.dom.table_container_inner.scrollTop()

		// 更改视图
			this.dom.filter_container.attr('viewtype', 'compare')
			this.dom.table_container_inner.scrollTop( 0 )

		// 计算数据排序排序
			this.mark_high( true )
			this.thead_redraw( 500 )
	}
	_tablelist.prototype._ships_compare_off = function(){
		this.dom.filter_container.attr('viewtype', this._ships_last_viewtype)
		this.sort_table_restore()
		this.mark_high()
		this.thead_redraw( 500 )
		this.dom.table_container_inner.scrollTop( this._ships_last_scrollTop )
		delete this._ships_last_viewtype
		delete this._ships_last_scrollTop
	}
	_tablelist.prototype._ships_compare_end = function(){
		this.dom.tbody.find('input[type="checkbox"].compare:checked').prop('checked', false).trigger('change')
		this.dom.msg_container.removeAttr('data-msgs')
		this._ships_compare_off()
	}
	_tablelist.prototype._ships_compare_continue = function(){
		this.dom.msg_container.attr('data-msgs', 'comparestart')
		this._ships_compare_off()
	}
	_tablelist.prototype._ships_init = function(){
		var self = this
			this.trIndex = 0

		// 标记全局载入状态
			_frame.app_main.loading.push('tablelist_'+this._index)
			_frame.app_main.is_loaded = false

			//_g.log( 'shiplist init', _frame.app_main.loading )

		// 生成过滤器与选项
			this.dom.filter_container = $('<div class="options"/>').appendTo( this.dom.container )
			this.dom.filters = $('<div class="filters"/>').appendTo( this.dom.filter_container )
			this.dom.exit_compare = $('<div class="exit_compare"/>')
									.append(
										$('<button icon="arrow-set2-left"/>')
											.html('结束对比')
											.on('click', function(){
												self._ships_compare_end()
											})
									)
									.append(
										$('<button icon="checkbox-checked"/>')
											.html('继续选择')
											.on('click', function(){
												self._ships_compare_continue()
											})
									)
									.appendTo( this.dom.filter_container )
			this.dom.btn_compare_sort = $('<button icon="sort-amount-desc" class="disabled"/>')
												.html('点击表格标题可排序')
												.on('click', function(){
													if( !self.dom.btn_compare_sort.hasClass('disabled') )
														self.sort_table_restore()
												}).appendTo( this.dom.exit_compare )

		// 初始化设置
			this.append_option( 'checkbox', 'hide-premodel', '仅显示同种同名舰最终版本',
				_config.get( 'shiplist-filter-hide-premodel' ) === 'false' ? null : true, null, {
					'onchange': function( e, input ){
						_config.set( 'shiplist-filter-hide-premodel', input.prop('checked') )
						self.dom.filter_container.attr('filter-hide-premodel', input.prop('checked'))
						self.thead_redraw()
					}
				} )
			this.append_option( 'radio', 'viewtype', null, [
					['card', ''],
					['list', '']
				], null, {
					'radio_default': _config.get( 'shiplist-viewtype' ),
					'onchange': function( e, input ){
						if( input.is(':checked') ){
							_config.set( 'shiplist-viewtype', input.val() )
							self.dom.filter_container.attr('viewtype', input.val())
							self.thead_redraw()
						}
					}
				} )
			this.dom.filters.find('input').trigger('change')

		// 生成表格框架
			this.dom.table_container = $('<div class="fixed-table-container"/>').appendTo( this.dom.container )
			this.dom.table_container_inner = $('<div class="fixed-table-container-inner"/>').appendTo( this.dom.table_container )
			this.dom.table = $('<table class="ships hashover hashover-column"/>').appendTo( this.dom.table_container_inner )
			function gen_thead(arr){
				self.dom.thead = $('<thead/>')
				var tr = $('<tr/>').appendTo(self.dom.thead)
				for(var i in arr){
					(function( obj ){
						if( typeof obj == 'object' ){
							var td = $('<td data-stat="' + obj[1] + '"/>')
										.html('<div class="th-inner-wrapper"><span><span>'+obj[0]+'</span></span></div>')
										.on('click', function(){
											self.sort_table_from_theadcell(td)
										})
										.appendTo(tr)
						}else{
							$('<th/>').html('<div class="th-inner-wrapper"><span><span>'+obj[0]+'</span></span></div>').appendTo(tr)
						}
					})(arr[i])
				}
				return self.dom.thead
			}
			gen_thead( self._ships_columns ).appendTo( this.dom.table )
			this.dom.tbody = $('<tbody/>').appendTo( this.dom.table )

		// 获取所有舰娘数据，按舰种顺序 (_g.ship_type_order / _g.ship_type_order_map) 排序
		// -> 获取舰种名称
		// -> 生成舰娘DOM
			if( _g.data.ship_types ){
				self._ships_append_all_items()
			}else{
				$('<p/>').html('暂无数据...').appendTo( self.dom.table_container_inner )
			}
			//_db.ships.find({}).sort({'type': 1, 'class': 1, 'class_no': 1, 'time_created': 1, 'name.suffix': 1}).exec(function(err, docs){
			//	if( !err ){
			//		for(var i in docs){
			//			_g.data.ships[docs[i]['id']] = docs[i]

			//			if( typeof _g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ] == 'undefined' )
			//				_g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ] = []
			//			_g.data.ship_id_by_type[ _g.ship_type_order_map[docs[i]['type']] ].push( docs[i]['id'] )
			//		}
			//	}

				/*
				_db.ship_types.find({}, function(err2, docs2){
					if( !err2 ){
						for(var i in docs2 ){
							_g.data.ship_types[docs2[i]['id']] = docs2[i]
						}

					}
				})
				*/
			//	if( _g.data.ship_types ){
			//		self._ships_append_all_items()
			//	}else{
			//		$('<p/>').html('暂无数据...').appendTo( self.dom.table_container_inner )
			//	}
			//})

		// 生成底部内容框架
			this.dom.msg_container = $('<div class="msgs"/>').appendTo( this.dom.container )
			if( !_config.get( 'hide-compareinfos' ) )
				this.dom.msg_container.attr( 'data-msgs', 'compareinfos' )

		// 生成部分底部内容
			var compareinfos = $('<div class="compareinfos"/>').html('点击舰娘查询详细信息，勾选舰娘进行对比').appendTo( this.dom.msg_container )
				$('<button/>').html('&times;').on('click', function(){
					self.dom.msg_container.removeAttr('data-msgs')
					_config.set( 'hide-compareinfos', true )
				}).appendTo( compareinfos )
			var comparestart = $('<div class="comparestart"/>').html('开始对比')
								.on('click', function(){
									self._ships_compare_start()
								}).appendTo( this.dom.msg_container )
	}












// Equipments
	_tablelist.prototype._equipments_columns = [
		'  ',
		['火力',	'fire'],
		['雷装',	'torpedo'],
		['对空',	'aa'],
		['对潜',	'asw'],
		['爆装',	'bomb'],
		['命中',	'hit'],
		['装甲',	'armor'],
		['回避',	'evasion'],
		['索敌',	'los'],
		['射程',	'range']
	]
	_tablelist.prototype._equipments_append_item = function( equipment_data, collection_id ){
		var self = this
			,tr = $('<tr class="row" data-equipmentid="'+ equipment_data['id'] +'" data-equipmentcollection="'+ collection_id +'"/>')
					.attr({
						'data-infos': 		'[[EQUIPMENT::'+ equipment_data['id'] +']]',
						'data-equipmentedit':self.dom.container.hasClass('equipmentlist-edit') ? 'true' : null
					})
					.appendTo( this.dom.tbody )

		function _val( val, show_zero ){
			if( !show_zero && (val == 0 || val === '0' || val === '') )
				return '<small class="zero">-</small>'
			//if( val > 0 )
			//	return '+' + val
			return val
		}

		for( var i in self._equipments_columns ){
			switch( self._equipments_columns[i][1] ){
				case ' ':
					$('<th/>').html(equipment_data['name']['zh_cn']).appendTo(tr)
					break;
				case 'range':
					$('<td data-stat="range" data-value="' + equipment_data['stat']['range'] + '"/>')
						.html(
							equipment_data['stat']['range']
								? _g.getStatRange( equipment_data['stat']['range'] )
								: '<small class="zero">-</small>'
						)
						.appendTo(tr)
					break;
				default:
					$('<td data-stat="'+self._equipments_columns[i][1]+'" data-value="' + equipment_data['stat'][self._equipments_columns[i][1]] + '"/>')
						.addClass( equipment_data['stat'][self._equipments_columns[i][1]] < 0 ? 'negative' : '' )
						.html( _val( equipment_data['stat'][self._equipments_columns[i][1]] ) )
						.appendTo(tr)
					break;
			}
		}

		return tr
	}
	_tablelist.prototype._equipments_append_all_items = function(){
		var self = this
		function _do( i, j ){
			if( _g.data.item_id_by_type[i] ){
				if( !j ){
					var data_equipmenttype = _g.data.item_types[ _g.item_type_order[i] ]
					$('<tr class="typetitle" data-equipmentcollection="'+_g.data.item_id_by_type[i]['collection']+'">'
							+ '<th colspan="' + (self._equipments_columns.length + 1) + '">'
								+ '<span style="background-image: url(../app/assets/images/itemicon/'+data_equipmenttype['icon']+'.png)"></span>'
								+ data_equipmenttype['name']['zh_cn']
								+ _frame.app_main.page['equipments'].gen_helper_equipable_on( data_equipmenttype['id'] )
							+ '</th></tr>'
						).appendTo( self.dom.tbody )
				}

				self._equipments_append_item(
					_g.data.items[ _g.data.item_id_by_type[i]['equipments'][j] ],
					_g.data.item_id_by_type[i]['collection']
				)

				setTimeout(function(){
					if( j >= _g.data.item_id_by_type[i]['equipments'].length - 1 ){
						_do( i+1, 0 )
					}else{
						_do( i, j+1 )
					}
				}, 0)
			}else{
				//self.mark_high()
				// force thead redraw
					self.thead_redraw()
				_frame.app_main.loaded('tablelist_'+self._index, true)
			}
		}
		_do( 0, 0 )
	}
	_tablelist.prototype._equipments_init = function(){
		var self = this

		// 根据装备大类和类型排序整理装备ID
			if( !_g.data.item_id_by_type ){
				_g.data.item_id_by_type = []
				_g.item_type_order = []
				var type_by_collection = {}
					,type_order_map = {}
				// 遍历大类
					for(var i in _g.data.item_type_collections){
						for(var j in _g.data.item_type_collections[i]['types']){
							type_by_collection[ _g.data.item_type_collections[i]['types'][j] ] = i
							_g.item_type_order.push( _g.data.item_type_collections[i]['types'][j] )
							type_order_map[ _g.data.item_type_collections[i]['types'][j] ] = _g.item_type_order.length - 1
						}
					}
				// 遍历装备数据
					for(var i in _g.data.items){
						var order = type_order_map[ _g.data.items[i]['type'] ]
						if( !_g.data.item_id_by_type[order] )
							_g.data.item_id_by_type[order] = {
								'collection': type_by_collection[_g.data.items[i]['type']],
								'equipments': []
							}
						_g.data.item_id_by_type[order]['equipments'].push( _g.data.items[i]['id'] )
					}
			}

		// 标记全局载入状态
			_frame.app_main.loading.push('tablelist_'+this._index)
			_frame.app_main.is_loaded = false

		// 生成过滤器与选项
			this.dom.filter_container = $('<div class="options"/>').appendTo( this.dom.container )
			this.dom.filters = $('<div class="filters"/>').appendTo( this.dom.filter_container )

		// 装备大类切换
			var checked = false
			for(var i in _g.data.item_type_collections){
				var radio_id = '_input_g' + parseInt(_g.inputIndex)
				$('<input type="radio" name="equipmentcollection" id="'+radio_id+'" value="'+i+'"/>')
					.prop('checked', !checked )
					.on('change', function(){
						// force thead redraw
						self.thead_redraw()
					})
					.prependTo( this.dom.container )
				$('<label class="tab container" for="'+radio_id+'" data-equipmentcollection="'+i+'"/>')
					.html(
						'<i></i><em></em>'
						+ '<span>' + _g.data.item_type_collections[i]['name']['zh_cn'].replace(/\&/g, '<br/>') + '</span>'
					)
					.appendTo( self.dom.filters )
				checked = true
				_g.inputIndex++
			}

		// 生成表格框架
			this.dom.table_container = $('<div class="fixed-table-container"/>').appendTo( this.dom.container )
			this.dom.table_container_inner = $('<div class="fixed-table-container-inner"/>').appendTo( this.dom.table_container )
			this.dom.table = $('<table class="equipments hashover hashover-column"/>').appendTo( this.dom.table_container_inner )
			function gen_thead(arr){
				self.dom.thead = $('<thead/>')
				var tr = $('<tr/>').appendTo(self.dom.thead)
				for(var i in arr){
					if( typeof arr[i] == 'object' ){
						$('<td data-stat="' + arr[i][1] + '"/>')
							.html('<div class="th-inner-wrapper"><span><span>'+arr[i][0]+'</span></span></div>').appendTo(tr)
					}else{
						$('<th/>').html('<div class="th-inner-wrapper"><span><span>'+arr[i][0]+'</span></span></div>').appendTo(tr)
					}
				}
				return self.dom.thead
			}
			gen_thead( self._equipments_columns ).appendTo( this.dom.table )
			this.dom.tbody = $('<tbody/>').appendTo( this.dom.table )

		// 生成装备数据DOM
			self._equipments_append_all_items()

		// 生成底部内容框架
			this.dom.msg_container = $('<div class="msgs"/>').appendTo( this.dom.container )
			if( !_config.get( 'hide-equipmentsinfos' ) )
				this.dom.msg_container.attr( 'data-msgs', 'equipmentsinfos' )

		// 生成部分底部内容
			var equipmentsinfos = $('<div class="equipmentsinfos"/>').html('点击装备查询初装舰娘等信息').appendTo( this.dom.msg_container )
				$('<button/>').html('&times;').on('click', function(){
					self.dom.msg_container.removeAttr('data-msgs')
					_config.set( 'hide-equipmentsinfos', true )
				}).appendTo( equipmentsinfos )
	}










_tablelist.prototype.append_option = function( type, name, label, value, suffix, options ){
	options = options || {}
	function gen_input(){
		switch( type ){
			case 'text':
			case 'number':
			case 'hidden':
				var input = $('<input type="'+type+'" name="'+name+'" id="'+id+'" />').val(value)
				break;
			case 'select':
				var input = $('<select name="'+name+'" id="'+id+'" />')
				var option_empty = $('<option value=""/>').html('').appendTo( input )
				for( var i in value ){
					if( typeof value[i] == 'object' ){
						var o_el = $('<option value="' + (typeof value[i].val == 'undefined' ? value[i]['value'] : value[i].val) + '"/>')
							.html(value[i]['title'] || value[i]['name'])
							.appendTo( input )
					}else{
						var o_el = $('<option value="' + value[i] + '"/>')
							.html(value[i])
							.appendTo( input )
					}
					if( typeof options['default'] != 'undefined' && o_el.val() == options['default'] ){
						o_el.prop('selected', true)
					}
				}
				if( !value || !value.length ){
					option_empty.remove()
					$('<option value=""/>').html('...').appendTo( input )
				}
				if( options['new'] ){
					$('<option value=""/>').html('==========').insertAfter( option_empty )
					$('<option value="___new___"/>').html('+ 新建').insertAfter( option_empty )
					input.on('change.___new___', function(){
						var select = $(this)
						if( select.val() == '___new___' ){
							select.val('')
							options['new']( input )
						}
					})
				}
				break;
			case 'checkbox':
				var input = $('<input type="'+type+'" name="'+name+'" id="'+id+'" />').prop('checked', value)
				break;
			case 'radio':
				var input = $();
				for( var i in value ){
					var title, val
						,checked = false
					if( value[i].push ){
						val = value[i][0]
						title = value[i][1]
					}else{
						val = value[i].val || value[i].value
						title = value[i].title || value[i].name
					}
					if( options.radio_default && options.radio_default == val )
						checked = true
					input = input.add(
						$('<input type="radio" name="'+name+'" id="'+id+'-'+val+'" ischecked="'+checked+'" />')
							.val(val)
							.prop('checked', (checked || (!checked && i == 0) ))
						)
					input = input.add($('<label for="'+id+'-'+val+'"/>').html( title ))
				}
				break;
		}

		if( options.required ){
			input.prop('required', true)
		}

		if( options.onchange ){
			input.on('change.___onchange___', function(e){
				options.onchange( e, $(this) )
			})
			if( options['default'] )
				input.trigger('change')
		}

		if( !name )
			input.attr('name', null)

		return input
	}

	var line = $('<p/>').addClass(name).appendTo( this.dom.filters )
		,id = '_input_g' + parseInt(_g.inputIndex)

		,label = label ? $('<label for="'+id+'"/>').html( label ).appendTo(line) : null
		,input = gen_input().appendTo(line)

	if( type == 'checkbox' && label )
		label.insertAfter(input)

	if( suffix )
		$('<label for="'+id+'"/>').html(suffix).appendTo(line)

	_g.inputIndex++
	return line
}

// 强制 thead 重绘，以解决某些CSS计算延迟问题
	_tablelist.prototype.thead_redraw = function( timeout_duration ){
		if( this.dom.thead && this.dom.thead.length ){
			var thead = this.dom.thead
			setTimeout(function(){
				thead.hide().show(0)
			}, timeout_duration || 10)
		}
	}














// 表格排序相关
	// 排序表格中正在显示行中某一列(td:nth-of-type)
	// 返回一个Array，每一个元素为jQuery DOM Object
	// is_ascending 	是否为升序，默认降序
	// rows				目标行，默认为全部可见行
		_tablelist.prototype.sort_column = function( nth, is_ascending, rows ){
			if( !rows ){
				var tbody = this.dom.tbody
				if( !tbody || !tbody.length )
					tbody = this.dom.table.find('tbody')
				rows = tbody.find('tr.row:visible').not('[data-donotcompare]')
			}
			nth = nth || 1

			// 建立临时用对象，在函数结束时delete
				this._tmp_values = []
				this._tmp_value_map_cell = {}

			var self = this

			// 遍历，将值全部导出到 _tmp_values，_tmp_value_map_cell 中记录 值 -> jQuery DOM
				rows.find('td:nth-of-type(' + nth + ')').each(function(index){
					var cell = $(this)
						,val = $(this).data('value')

					val = parseFloat(val)

					if( $.inArray( val, self._tmp_values ) < 0 )
						self._tmp_values.push( val )

					if( !self._tmp_value_map_cell[val] )
						self._tmp_value_map_cell[val] = $()

					self._tmp_value_map_cell[val] = self._tmp_value_map_cell[val].add( cell )
				})

			// 排序
				this._tmp_values.sort(function(a, b){
					if( is_ascending )
						return a-b
					else
						return b-a
				})

			// 根据排序结果，整理返回结果
				var return_array = []
				for(var i in this._tmp_values){
					return_array.push( this._tmp_value_map_cell[this._tmp_values[i]] )
				}

			// delete 临时对象
				delete this._tmp_values
				delete this._tmp_value_map_cell

			return return_array
		}

	// 标记表格全部数据列中第一和第二高值的单元格
		_tablelist.prototype.mark_high = function( cacheSortData ){
			var tbody = this.dom.tbody

			if( !tbody || !tbody.length )
				tbody = this.dom.table.find('tbody')

			var rows = tbody.find('tr.row:visible').not('[data-donotcompare]')
				,sort_data_by_stat = this.sort_data_by_stat

			rows.find('td[data-value]').removeClass('sort-first sort-second')

			rows.eq(0).find('td[data-value]').each(function(index){
				var is_ascending = false
					,$this = $(this)
					,stat = $this.data('stat')

				// 以下属性不进行标记，但仍计算排序
					,noMark = stat.match(/\b(speed|range)\b/ )

				// 以下属性为升序
					if( stat.match(/\b(consum_fuel|consum_ammo)\b/ ) )
						is_ascending = true

				var sort = _tablelist.prototype.sort_column( index+1, is_ascending, rows )
					,max = Math.min( 6, Math.ceil(rows.length / 2) + 1 )

				if( !noMark && sort.length > 1 && sort[0].length < max ){
					sort[0].addClass('sort-first')
					if( sort.length > 2 && sort[1].length < max )
						sort[1].addClass('sort-second')
				}

				// 将排序结果存储到表头对应的列中
					if( cacheSortData )
						sort_data_by_stat[stat] = sort
					else
						delete( sort_data_by_stat[stat] )

			})

			return rows
		}

	// thead td, thead th
	// 点击表头单元格，表格排序
		_tablelist.prototype.sort_table_from_theadcell = function( cell ){
			var stat = cell.data('stat')
				,sortData = this.sort_data_by_stat[stat]
			if( !stat || !sortData )
				return false

			var order = (stat == this.lastSortedStat && this.lastSortedOrder == 'obverse')
							? 'reverse'
							: 'obverse'
				,i = order == 'reverse' ? sortData.length - 1 : 0

			this.sortedRow = $()

			while( sortData[i] ){
				this._tmpDOM = sortData[i].parent()
				this.sortedRow = this.sortedRow.add( this._tmpDOM )
				this._tmpDOM.appendTo( this.dom.tbody )
				i = order == 'reverse' ? i - 1 : i + 1
			}

			// 修改排序提示按钮
				this.dom.btn_compare_sort.removeClass('disabled').html('取消排序')

			this.lastSortedStat = stat
			this.lastSortedOrder = order
			delete this._tmpDOM
		}

	// 重置表格排序
		_tablelist.prototype.sort_table_restore = function(){
			if( !this.sortedRow )
				return true

			// 还原所有DOM位置
				var parent, arr = []
				this.sortedRow.each(function(){
					var $this = $(this)
						,trIndex = parseInt( $this.data('trindex') )
					parent = parent || $this.parent()
					arr.push({
						'index': 	trIndex,
						'el': 		$this,
						'prev': 	parent.children('tr[data-trindex="' + (trIndex - 1) + '"]')
					})
				})
				// 如果在上一步直接将DOM移动到上一个index行的后方，可能会因为目标DOM也为排序目标同时在当前DOM顺序后，造成结果不正常
				// 故需要两步操作
				arr.sort(function(a, b){
					return a['index']-b['index']
				})
				for(var i in arr){
					arr[i].el.insertAfter( arr[i].prev )
				}

			// 修改排序提示按钮
				this.dom.btn_compare_sort.addClass('disabled').html('点击表格标题可排序')

			delete this.sortedRow
			delete this.lastSortedStat
			delete this.lastSortedOrder
			return true
		}




















_tablelist.prototype.init = function(){
	if( this.is_init )
		return true

	if( this['_' + this.listtype + '_init'] )
		this['_' + this.listtype + '_init']()

	this.is_init = true
}

// @koala-prepend "js-app/main.js"
// @koala-prepend "js-app/updater.js"

// @koala-prepend "js-app/templates/link_equipment.js"
// @koala-prepend "js-app/templates/link_ship.js"

// @koala-prepend "js-app/page/ships.js"
// @koala-prepend "js-app/page/equipments.js"
// @koala-prepend "js-app/page/about.js"

// @koala-prepend "js-app/frame/infos.js"
// @koala-prepend "js-app/frame/tip-equipment.js"

// @koala-prepend "js-app/elements/tablelist.js"
