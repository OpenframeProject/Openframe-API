$(function() {
    var allFrames = [],
        currentFrame,
        currentCollection,
        $rowCollection = $('.row-collection'),
        $frameDropdown = $('.dropdown-frames'),
        artworkTemplate = _.template($('#ArtworkTemplate').text()),
        pagination = {
            skip: 0,
            limit: 25
        },
        framesDropdownTemplate = _.template($('#FramesDropdownTemplate').text()),
        pubsub = window.PubSub;

    /**
     * Find an artwork in the current collection by artworkId
     * @param  {String} artworkId
     * @return {Object}
     */
    function findArtworkById(artworkId) {
        return _.find(currentCollection, function(artworkData) {
            return artworkData.id === artworkId;
        });
    }

    function getArtworkViewModel(artwork) {
        var art = _.extend({}, artwork);
        addFormatDisplayName(art);
        art.disabled = currentFrame && currentFrame.plugins.hasOwnProperty(art.format) ? 'btn-push--enabled' : 'btn-push--disabled';
        art.liked = art.liked || false;
        art.currentArtworkId = currentFrame && currentFrame._current_artwork ? currentFrame._current_artwork.id : null;
        return art;
    }

    function selectFrame(_frameId) {
        currentFrame = _.find(allFrames, function(frame) {
            return frame.id === _frameId;
        });
        renderFrameDropdown();
    }

    function updateFrame(frameId) {
        console.log('updateFrame', frameId);
    }

    function removeFrame(frameId) {
        console.log(frameId);
        var index = _.findIndex(allFrames, function(frame) {
            console.log(frame.id, frameId);
            return frame.id.toString() === frameId.toString();
        });
        console.log(index);
        if (index !== -1) {
            allFrames.splice(index, 1);
        }
        if (allFrames.length > 0) {
            currentFrame = allFrames[0];
        } else {
            currentFrame = null;
        }
        renderFrameDropdown();
    }

    // render artworks to screen
    function renderCollection(artworks) {
        console.log('renderCollection', artworks);
        if (!artworks || !artworks.length) return;
        artworks.forEach(function(artwork) {
            renderArtwork(artwork);
        });
    }

    function renderArtwork(artwork, top) {
        var art = _.extend({}, artwork);
        addFormatDisplayName(art);
        art.disabled = currentFrame && currentFrame.plugins.hasOwnProperty(art.format) ? 'btn-push--enabled' : 'btn-push--disabled';
        art.liked = art.liked || false;
        art.currentArtworkId = currentFrame && currentFrame._current_artwork ? currentFrame._current_artwork.id : null;
        if (top) {
            $('.tile-item').first().after(artworkTemplate(art));
        } else {
            $rowCollection.append(artworkTemplate(art));
        }
    }

    function removeArtwork(artwork) {
        var index = _.findIndex(currentCollection, function(art) {
            return art.id === artwork.id;
        });
        if (index !== -1) {
            currentCollection.splice(index, 1);
        }
        $('*[data-artworkid="' + artwork.id + '"]').remove();
    }

    function replaceArtwork(artwork) {
        var index = _.findIndex(currentCollection, function(art) {
            return art.id === artwork.id;
        });
        if (index !== -1) {
            currentCollection[index] = artwork;
        }
        var art = getArtworkViewModel(artwork);
        $('*[data-artworkid="' + artwork.id + '"]').replaceWith(artworkTemplate(art));
    }

    function hideFrameSettings() {
        $('.btn-frame-settings').addClass('hide');
    }

    function showFrameSettings() {
        $('.btn-frame-settings').removeClass('hide');
    }

    // render frame list to screen
    function renderFrameDropdown() {
        console.log('renderFrameDropdown');
        if (!currentFrame || !allFrames.length) {
            $frameDropdown.empty();
            hideFrameSettings();
            return;
        }
        console.log(currentFrame.ownerId, window.USER_ID);
        if (currentFrame.ownerId.toString() === window.USER_ID.toString()) {
            console.log('show');
            showFrameSettings();
        } else {
            hideFrameSettings();
        }
        var data = {
            currentFrame: currentFrame,
            frames: allFrames
        };
        $frameDropdown.empty().html(framesDropdownTemplate(data));
    }

    // add more human-friendly names for the standard three plugins
    function addFormatDisplayName(artwork) {
        switch (artwork.format) {
            case 'openframe-glslviewer':
                artwork.formatDisplayName = 'shader';
                break;
            case 'openframe-image':
                artwork.formatDisplayName = 'image';
                break;
            case 'openframe-website':
                artwork.formatDisplayName = 'website';
                break;
            default:
                artwork.formatDisplayName = artwork.format;
        }
    }

    // zip through and setup event handlers
    function bindEvents() {
        console.log('bindEvents');

        // handle like button click
        $(document).on('click', '.btn-like', function(e) {
            e.preventDefault();
            var $btn = $(this);
            console.log(currentCollection);
            OF.likeArtwork($(this).data('artworkid')).then(function(resp) {
                $btn.removeClass('btn-like').addClass('btn-unlike');
            }).fail(function(err) {
                console.log(err);
            });
        });

        // handle unlike button click
        $(document).on('click', '.btn-unlike', function(e) {
            e.preventDefault();
            var $btn = $(this);
            console.log(currentCollection);
            OF.unlikeArtwork($(this).data('artworkid')).then(function(resp) {
                $btn.removeClass('btn-unlike').addClass('btn-like');
            }).fail(function(err) {
                console.log(err);
            });
        });


        $(document).on('click', '.btn-push--enabled', function(e) {
            var artworkId = $(this).data('artworkid'),
                // get the artwork data from the collection
                artwork = findArtworkById(artworkId);

            // Set button to 'pushing' state (spinner)
            $(this).removeClass('btn-push').addClass('btn-pushing rotating');

            if (artwork && currentFrame) {
                OF.pushArtwork(currentFrame.id, artwork)
                    .then(function(resp) {
                        // replace the artwork being pushed
                        replaceArtwork(artwork);

                        // if there's already an artwork in 'displaying' status, update it
                        var artId = $('.btn-displaying').first().data('artworkid');
                        if (artId) {
                            // get the artwork data from the collection
                            var art = findArtworkById(artId);
                            replaceArtwork(art);
                        }

                        OF.fetchFrames().then(function(data) {
                            console.log(data);
                            allFrames = data.frames;
                            if (currentFrame) {
                                currentFrame = _.find(allFrames, function(frame) {
                                    return currentFrame.id === frame.id;
                                });
                            } else {
                                currentFrame = allFrames[0];
                            }



                            renderFrameDropdown();
                        }).fail(function(err) {
                            console.log(err);
                        });
                    })
                    .fail(function(err) {
                        console.log(err);
                    });
            }
        });

        $(document).on('click', '.frame-select-link', function(e) {
            var frameId = $(this).data('frameid');

            if (frameId) {
                selectFrame(frameId);
            }
        });

        // when the edit modal appears, populate with artwork
        $('#FrameSettingsModal').on('show.bs.modal', function(event) {
            console.log('currentFrame', currentFrame);
            var modal = $(this),
                frameForForm = Object.assign({}, currentFrame, {
                    name: currentFrame.name,
                    plugins: Object.keys(currentFrame.plugins).join(', '),
                    managers: currentFrame.managers ? currentFrame.managers.map(function(manager) {
                        return manager.username;
                    }).join(', ') : ''
                });
            modal.find('form').fromObject(frameForForm);
        });

        $(document).on('click', '#SaveFrameButton', function(e) {
            e.preventDefault();
            var frame = $('#FrameSettingsForm').getObject(),
                managers = frame.managers.replace(/ /g, '').split(','),
                frameToUpdate = Object.assign(frame, {
                    managers: frame.managers.replace(/ /g, '').split(',')
                });

            OF.updateFrame(frame.id, {
                name: frame.name
            }).success(function() {
                OF.updateFrameManagers(frame.id, managers).success(function(resp) {
                    console.log(resp);
                    currentFrame = resp.frame;
                    $('#FrameSettingsModal').modal('hide');
                    renderFrameDropdown();
                }).error(function(err) {
                    console.log(err);
                });
            }).error(function(err) {
                console.log(err);
            });

        });

        $(document).on('click', '#DeleteFrame', function(e) {
            var frame = $('#FrameSettingsForm').getObject();
            console.log('delete frame!', frame);
            e.preventDefault();
            if (confirm('Are you sure you want to delete this frame? This action cannot be undone.')) {
                OF.deleteFrame(frame.id).then(function() {
                    $('#FrameSettingsModal').modal('hide');
                    removeFrame(frame.id);
                }).fail(function(err) {
                    $('#FrameSettingsModal .alert').html(err.responseJSON.error.message);
                    $('#FrameSettingsModal .row-errors').removeClass('hide');
                });
            }
        });

        // when the add modal appears, reset it
        $('#AddArtworkModal').on('show.bs.modal', function(event) {
            var modal = $(this);
            modal.find('form')[0].reset();
        });

        $(document).on('click', '#AddButton', function(e) {
            e.preventDefault();
            var artwork = $('#AddArtworkForm').getObject();
            OF.addArtwork(artwork).then(function(resp) {
                currentCollection.unshift(resp);
                renderArtwork(resp, true);
                $('#AddArtworkModal').modal('hide');
            }).fail(function(err) {
                $('#AddArtworkModal .alert').html(err.responseJSON.error.message);
                $('#AddArtworkModal .row-errors').removeClass('hide');
                console.log(err);
            });
            console.log(artwork);
        });

        // when the edit modal appears, populate with artwork
        $('#EditArtworkModal').on('show.bs.modal', function(event) {
            var button = $(event.relatedTarget),
                artworkId = button.data('artworkid'),
                // get the artwork data from the collection
                artwork = _.find(currentCollection, function(artworkData) {
                    return artworkData.id === artworkId;
                }),
                modal = $(this);
            modal.find('.alert').html('');
            modal.find('.row-errors').removeClass('hide');
            modal.find('form').fromObject(artwork);
        });

        $(document).on('click', '#EditButton', function(e) {
            e.preventDefault();
            var artwork = $('#EditForm').getObject();
            OF.updateArtwork(artwork.id, artwork).then(function(resp) {
                replaceArtwork(resp);
                $('#EditArtworkModal').modal('hide');
            }).fail(function(err) {
                $('#EditArtworkModal .alert').html(err.responseJSON.error.message);
                $('#EditArtworkModal .row-errors').removeClass('hide');
                console.log(err);
            });
            console.log(artwork);
        });

        // handle click on delete artwork link
        $(document).on('click', '#DeleteArtwork', function(e) {
            e.preventDefault();
            var artwork = $('#EditForm').getObject();
            if (confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
                OF.deleteArtwork(artwork.id).then(function() {
                    $('#EditArtworkModal').modal('hide');
                    removeArtwork(artwork);
                }).fail(function(err) {
                    $('#EditArtworkModal .alert').html(err.responseJSON.error.message);
                    $('#EditArtworkModal .row-errors').removeClass('hide');
                });
            }
        });

        // whenever a modal opens, clear errors
        $('.modal').on('show.bs.modal', function() {
            var modal = $(this);
            modal.find('.alert').html('');
            modal.find('.row-errors').addClass('hide');
        });

        $(window).scroll(function() {
            if ($(window).scrollTop() === $(document).height() - $(window).height()) {
                pagination.skip += pagination.limit;
                loadArtwork(pagination.skip);
            }
        });
    }

    /**
     * Load a page of Artwork objects from the server and render them.
     * @param  {Number} skip
     */
    function loadArtwork(skip) {
        skip = skip || 0;
        switch (window.PATH) {
            case '/stream':
                OF.fetchStream(skip, pagination.limit).then(function(stream) {
                    // collections = [stream.artwork];
                    currentCollection = stream.artwork;
                    renderCollection(currentCollection);
                }).fail(function(err) {
                    console.log(err);
                });
                break;
            case '/' + window.USERNAME:
                OF.fetchCollection(skip, pagination.limit).then(function(data) {
                    console.log(data);
                    currentCollection = data.collection.artwork;
                    renderCollection(currentCollection);
                }).fail(function(err) {
                    console.log(err);
                });
                break;
            default:

        }
    }

    function setupPubSubEvents() {
        console.log('setupPubSubEvents');
        allFrames.forEach(function(frame) {
            console.log(frame.id);
            pubsub.subscribe('/frame/' + frame.id + '/connected', function(data) {
                console.log('frame connected!', data);

            });
            pubsub.subscribe('/frame/' + frame.id + '/disconnected', function(data) {
                console.log('frame disconnected!', data);
            });
            pubsub.subscribe('/frame/' + frame.id + '/updated', function(data) {
                console.log('frame updated!', data);
                $('.btn-pushing').removeClass('btn-pushing').addClass('btn-displaying');
            });
            pubsub.subscribe('/frame/' + frame.id + '/updating', function(data) {
                console.log('frame updating!', data);
            });
        });
    }


    function init() {
        bindEvents();

        OF.fetchFrames().then(function(data) {
            console.log('data', data);
            allFrames = data.frames;
            if (allFrames.length < 1) {
                // user has no frames! show notice
                $('.row-notice').removeClass('hide');
            }
            if (currentFrame) {
                currentFrame = _.find(allFrames, function(frame) {
                    return currentFrame.id === frame.id;
                });
            } else {
                currentFrame = allFrames[0];
            }
            renderFrameDropdown();

            loadArtwork();

            setupPubSubEvents();

        }).fail(function(err) {
            console.log(err);
        });

        OF.fetchUser(true).then(function(user) {
            console.log(user.collections);
            _currentCollectionId = user.collections[0].id;
            _user = user;
        }).fail(function(err) {
            console.log(err);
        });



    }

    init();
});
