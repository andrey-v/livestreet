var ls = ls || {};

/**
* Обработка комментариев
*/
ls.comments = (function ($) {
	/**
	* Опции
	*/
	this.options = {
		type: {
			topic: {
				url_add: 		aRouter.blog+'ajaxaddcomment/',
				url_response: 	aRouter.blog+'ajaxresponsecomment/'
			},
			talk: {
				url_add: 		aRouter.talk+'ajaxaddcomment/',
				url_response: 	aRouter.talk+'ajaxresponsecomment/'
			}
		},
		classes: {
			form_loader: 'loader',
			comment_new: 'new',
			comment_current: 'current',
			comment_deleted: 'deleted',
			comment_self: 'self',
			comment: 'comment',
			comment_goto_parent: 'goto-comment-parent',
			comment_goto_child: 'goto-comment-child'
		}
	};

	this.iCurrentShowFormComment=0;

	// Добавляет комментарий
	this.add = function(formObj, targetId, targetType) {
		formObj = $('#'+formObj);

		$('#form_comment_text').addClass(this.options.classes.form_loader).attr('readonly',true);
		if (BLOG_USE_TINYMCE) {
			$('#form_comment input[name=submit_comment]').attr('disabled', 'disabled');
		}
		ls.ajax(this.options.type[targetType].url_add, formObj.serializeJSON(), function(result){
			if (!result) {
				this.enableFormComment();
				ls.msg.error('Error','Please try again later');
				return;
			}
			if (result.bStateError) {
				this.enableFormComment();
				ls.msg.error(null,result.sMsg);
			} else {
				this.enableFormComment();
				$('#form_comment_text').val('');

				// Load new comments
				this.load(targetId, targetType, result.sCommentId, true);
			}
			if (BLOG_USE_TINYMCE) {
				$('#form_comment input[name=submit_comment]').attr('disabled', '');
			}
		}.bind(this));
	}


	// Активирует форму
	this.enableFormComment = function() {
		$('#form_comment_text').removeClass(this.options.classes.form_loader).attr('readonly',false);
	},


	// Показывает/скрывает форму комментирования
	this.toggleCommentForm = function(idComment, bNoFocus) {
		$('#form_comment').appendTo("#reply_"+idComment);
		$('#form_comment_text').val('');
		if (!bNoFocus) $('#form_comment_text').focus();
		$('#form_comment_reply').val(idComment);
		$("#reply_"+idComment).css('display','block');
		$('#comment_preview_'+this.iCurrentShowFormComment).html('').css('display','none');
		this.iCurrentShowFormComment=idComment;
	},


	// Подгружает новые комментарии
	this.load = function(idTarget, typeTarget, selfIdComment, bNotFlushNew) {		
		var idCommentLast = $("#comment_last_id").val();

		// Удаляем подсветку у комментариев
		if (!bNotFlushNew) { 
			$('.comment').each(function(index, item){ 
				$(item).removeClass(this.options.classes.comment_new+' '+this.options.classes.comment_current);
			}.bind(this)); 
		}

		objImg = $('#update-comments');
		objImg.attr('src', DIR_STATIC_SKIN+'/images/update_act.gif');

		var params = { idCommentLast: idCommentLast, idTarget: idTarget, typeTarget: typeTarget };
		if (selfIdComment) { 
			params.selfIdComment = selfIdComment; 
		}
		if ($('#comment_use_paging').val()) { 
			params.bUsePaging = 1; 
		}

		ls.ajax(this.options.type[typeTarget].url_response, params, function(result) {
			objImg.attr('src', DIR_STATIC_SKIN+'/images/update.gif');

			if (!result) { ls.msg.error('Error','Please try again later'); }
			if (result.bStateError) {
				ls.msg.error(null,result.sMsg);
			} else {
				var aCmt = result.aComments;
				if (aCmt.length > 0 && result.iMaxIdComment) { 
					$("#comment_last_id").val(result.iMaxIdComment); 
				}
				if (selfIdComment) { 
					this.toggleCommentForm(0, true); 
				} else { 
					this.setCountNewComment(aCmt.length); 
				}

				$.each(aCmt, function(index, item) { 
					this.inject(item.idParent, item.id, item.html); 
				}.bind(this));

				if (selfIdComment && $('#comment_id_'+selfIdComment).length) { 
					this.scrollToComment(selfIdComment);
				}
			}
		}.bind(this));
	},


	// Вставка комментария
	this.inject = function(idCommentParent, idComment, sHtml) {
		var newComment = $('<div>', {'class': 'comment-wrapper', id: 'comment_wrapper_id_'+idComment}).html(sHtml);
		if (idCommentParent) {
			$('#comment_wrapper_id_'+idCommentParent).append(newComment);
		} else {
			$('#comments').append(newComment);
		}
	},


	// Удалить/восстановить комментарий
	this.toggle = function(obj, commentId) {
		ls.ajax(aRouter['ajax']+'comment/delete/', { idComment: commentId }, function(result){
			if (!result) {
				ls.msg.error('Error','Please try again later');
			}
			if (result.bStateError) {
				ls.msg.error(null,result.sMsg);
			} else {
				ls.msg.notice(null,result.sMsg);

				$('#comment_id_'+commentId).removeClass(this.options.classes.comment_self+' '+this.options.classes.comment_new+' '+this.options.classes.comment_deleted+' '+this.options.classes.comment_current);
				if (result.bState) {
					$('#comment_id_'+commentId).addClass(this.options.classes.comment_deleted);
				}
				$(obj).text(result.sTextToggle);
			}
		}.bind(this));
	},


	// Предпросмотр комментария
	this.preview = function() {
		if ($("#form_comment_text").val() == '') return;
		$("#comment_preview_"+this.iCurrentShowFormComment).css('display', 'block');
		ls.tools.textPreview('form_comment_text', false, 'comment_preview_'+this.iCurrentShowFormComment);
	},


	// Устанавливает число новых комментариев
	this.setCountNewComment = function(count) {
		if (count > 0) {
			$('#new_comments_counter').css('display','block').text(count);
		} else {
			$('#new_comments_counter').text(0).hide();
		}
	},


	// Вычисляет кол-во новых комментариев
	this.calcNewComments = function() {
		this.setCountNewComment($('.'+this.options.classes.comment+'.'+this.options.classes.comment_new).length);
	},


	// Переход к следующему комментарию
	this.goToNextComment = function() {
		var aCommentsNew = $('.'+this.options.classes.comment+'.'+this.options.classes.comment_new);

		$.scrollTo($(aCommentsNew[0]), 1000, {offset: -250});
		$('[id^=comment_id_]').removeClass(this.options.classes.comment_current);
		$(aCommentsNew[0]).removeClass(this.options.classes.comment_new).addClass(this.options.classes.comment_current);

		this.setCountNewComment(aCommentsNew.length - 1);
	},


	// Прокрутка к комментарию
	this.scrollToComment = function(idComment) {
		$.scrollTo('#comment_id_'+idComment, 1000, {offset: -250});
		$('[id^=comment_id_]').removeClass(this.options.classes.comment_current);
		$('#comment_id_'+idComment).addClass(this.options.classes.comment_current);
	},


	// Прокрутка к родительскому комментарию
	this.goToParentComment = function(id, pid) {
		thisObj = this;
		$('.'+this.options.classes.comment_goto_child).hide().find('a').unbind();

		$("#comment_id_"+pid).find('.'+this.options.classes.comment_goto_child).show().find("a").bind("click", function(){
			$(this).parent('.'+thisObj.options.classes.comment_goto_child).hide();
			thisObj.scrollToComment(id);
			return false;
		});
		this.scrollToComment(pid);
		return false;
	}



	return this;
}).call(ls.comments || {},jQuery);



$(document).ready(function(){
	ls.comments.calcNewComments();
});


if(BLOG_USE_TINYMCE) {
	comments._add = comments.add;

	comments.add = function(formObj,targetId,targetType) {
		$('#'+formObj+' textarea').val( tinyMCE.activeEditor.getContent());
		return this._add(formObj,targetId,targetType);
	};

	comments._preview = comments.preview;
	comments.preview = function () {
		$("#form_comment_text").val(tinyMCE.activeEditor.getContent());
		return this._preview();
	}

	comments.toggleCommentForm = function(idComment) {
		if (!$('#reply_'+this.iCurrentShowFormComment) || !$('#reply_'+idComment)) {
			return;
		}
		tinyMCE.activeEditor.setContent('');
		divCurrentForm=$('#reply_'+this.iCurrentShowFormComment);
		divNextForm=$('#reply_'+idComment);
		//var slideCurrentForm = new Fx.Slide(divCurrentForm);
		//var slideNextForm = new Fx.Slide(divNextForm);

		tinyMCE.execCommand('mceRemoveControl',true,'form_comment_text');

		$('#comment_preview_'+this.iCurrentShowFormComment).html('').css('display','none');
		if (this.iCurrentShowFormComment==idComment) {
			tinyMCE.execCommand('mceAddControl',true,'form_comment_text');
			//slideCurrentForm.toggle();
			//slideCurrentForm.addEvent('complete', function() {
			//tinyMCE.activeEditor.focus();
			//});

			return;
		}

		//slideCurrentForm.slideOut();
		divNextForm[0].innerHTML = divCurrentForm.html();
		divCurrentForm.html('');
		//slideNextForm.hide();
		divNextForm.css('display','block');
		tinyMCE.execCommand('mceAddControl',true,'form_comment_text');
		//slideNextForm.slideIn();

		$('#form_comment_text').val('');
		$('#form_comment_reply').val(idComment);
		this.iCurrentShowFormComment=idComment;
		//slideNextForm.addEvent('complete', function() {
		//tinyMCE.activeEditor.focus();
		//});
	}
}