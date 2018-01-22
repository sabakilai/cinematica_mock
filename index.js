const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const db = require('./data/db');

const token = '471714516:AAEeVDFJD3Htmu4d0FGLcdAV7xKD5NRtXKo';
const bot = new TelegramBot(token, {polling: true});

const cinemas = [
    [{ text: 'Все'}],
    [{ text: 'Космопарк'}],
    [{ text: 'Алатоо'}],
    [{ text: 'Вефа'}],
    [{ text: 'Октябрь'}]
]
bot.onText(/\/start/, (msg, match) => {
    const id = msg.from.id;
    const chatId = msg.chat.id;
    let films = [];
    let pic_stream;
    let message;
    db.find({where: {userId: id}}).then(user => {
        if (!user) {
            db.create({userId: id})
        } else {
            db.update({stage: 0}, {where: {userId: id}})
        }
        
        films.push({
            id:1,
            name:'Кто наш папа, чувак?',
            poster:'https://cinematica.kg/uploads/movies/30b68a29-03dc-47a5-8526-e304886bd9af.jpg/1024/800',
            genre:'комедия',
            trailer:'https://cinematica.kg/uploads/trailers/b6fcc861-d52f-4270-aa66-b2423a7b5ef8.mp4',
            rating: '7.0'
        });
        films.push({
            id:2,
            name:'Сламбер: Лабиринты сна',
            poster:'https://cinematica.kg/uploads/movies/ad1cae95-7c80-4cc2-8a80-33d9f55fda1f.jpg/1024/800',
            genre:'ужасы',
            trailer:'https://cinematica.kg/uploads/trailers/7877cb43-06d2-41c6-b694-5d6f799c497a.mp4',
            rating: '5.0'
        });
        
        for(let i = 0; i< films.length; i++) {
            pic_stream = request.get(films[i].poster).on('error', function(err) { console.log( 'Start pic' + err); });
            message = films[i].name + '\nЖанр: ' + films[i].genre + '\nРейтинг: ' + films[i].rating + '\nТрейлер: ' + films[i].trailer 
            bot.sendPhoto(chatId, pic_stream, {
                caption:message,
                "reply_markup": {
                    "inline_keyboard": [
                        [
                            {
                                text: "Выбрать",
                                callback_data: films[i].id + '|' + films[i].name,
                            }
                        ],
                    ],
                }
            })
        }
    })
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    const text = msg.text;
    if (text == '/start') {
        return
    }
    db.find({where: {userId: id}}).then(user => {
        if (user && user.stage == 4) {
            if (/^\d+$/.test(text)) {
                //Save row in DB
                db.update({stage: 5}, {where: {userId: id}}).then (user => {
                    bot.sendMessage(msg.chat.id, 'Введите места через запятую.')
                })
            } else {
                bot.sendMessage(msg.chat.id, 'Неправильный ввод. Ряд должен быть числом.')
            }
        } else if (user && user.stage == 5) {
            let places = text.split(',');
            for (let i=0; i<places.length; i++) {
                if (!/^\d+$/.test(places[i])) {
                    return bot.sendMessage(msg.chat.id, 'Неправильный ввод. Ряд должен быть числом.')
                }
            }
            //CHECK SEATS
            bot.sendMessage(chatId, 'Места свободны. Перейдите на сайт чтобы купить билеты', {
                "reply_markup": {
                    "inline_keyboard": [
                        [
                            {
                                text: "Купить",
                                url: "example.com"
                            }
                        ],
                    ],
                }
            })
        }
    })
});

bot.onText(/\/callbackquery/, (msg, match) => {

});


bot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    let data = callbackQuery.data.split('|')
    let id = callbackQuery.from.id;
    console.log(callbackQuery.from.id)
    bot.answerCallbackQuery({callback_query_id:callbackQuery.id, text:data[1]})
        .then(() => {
            db.find({where: {userId: id}}). then(user => {
                if (user.stage == 0) {
                    bot.sendMessage(msg.chat.id, "Фильм выбран ")
                    .then(()=> {
                        var options = {
                            "parse_mode": "Markdown",
                            "reply_markup": JSON.stringify({
                                "keyboard": [
                                    [{ text: 'Утро 10:00-12:00'},{ text: 'День 12:00-17:00'}],
                                    [{ text: 'Вечер 17:00-20:00'},{ text: 'День 20:00-01:00'}]
                                ],
                                "resize_keyboard":true
                            })
                        };
                        db.update({stage: 1}, {where: {userId: id}}).then (user => {
                            bot.sendMessage(msg.chat.id, "Укажите время, по которому Вам вывести список фильмов", options)
                        })
                    })
                } else if (user.stage == 3) {
                    bot.sendMessage(msg.chat.id, 'Сеанс выбран')
                    .then(()=> {
                        let pic_url = 'https://s3.amazonaws.com/cinematicatelegram/hallCinematica.jpg';
                        let pic_stream = request.get(pic_url).on('error', function(err) { console.log( 'Seance choice ' + err); });
                        bot.sendPhoto(msg.chat.id, pic_stream)
                        .then(()=> {
                            db.update({stage: 4}, {where: {userId: id}}).then (() => {
                                bot.sendMessage(msg.chat.id, 'Введите ряд')
                            })
                        })
                    })
                }
            })
            
        });
});
bot.onText(/\Утро (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    console.log(msg)
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 1) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": [
                        [{ text: 'День 12:00-17:00'}, { text: 'Вечер 17:00-20:00'}],
                        [{ text: 'Ночь 20:00-01:00'}, { text: 'Далее'}]
                    ],
                    "resize_keyboard":true
                })
            };
            db.update({stage: 2}, {where: {userId: id}}).then (user => {
                bot.sendMessage(chatId, 'Добавьте еще время или продолжите, нажав "Далее"', options);
            })
            
        } else if (user && user.stage == 2) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": cinemas,
                    "one_time_keyboard" : true,
                    "resize_keyboard":true
                })
            };
            db.update({stage:3},{where: {userId:id}}).then (()=> {
                bot.sendMessage(chatId, 'Выберите кинотеатр', options)
            })
        }
    })
});

bot.onText(/\День (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    console.log(msg)
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 1) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": [
                        [{ text: 'Утро 10:00-12:00'}, { text: 'Вечер 17:00-20:00'}],
                        [{ text: 'Ночь 20:00-01:00'}, { text: 'Далее'}]
                    ],
                    "resize_keyboard":true
                })
            };
            db.update({stage: 2}, {where: {userId: id}}).then (user => {
                bot.sendMessage(chatId, 'Добавьте еще время или продолжите, нажав "Далее"', options);
            })
            
        } else if (user && user.stage == 2) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": cinemas,
                    "one_time_keyboard" : true,
                    "resize_keyboard":true
                })
            };
            db.update({stage:3},{where: {userId:id}}).then (()=> {
                bot.sendMessage(chatId, 'Выберите кинотеатр', options)
            })
        }
    })
});

bot.onText(/\Вечер (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 1) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": [
                        [{ text: 'Утро 10:00-12:00'}, { text: 'День 12:00-17:00'}],
                        [{ text: 'Ночь 20:00-01:00'}, { text: 'Далее'}]
                    ],
                    "resize_keyboard":true
                })
            };
            db.update({stage: 2}, {where: {userId: id}}).then (user => {
                bot.sendMessage(chatId, 'Добавьте еще время или продолжите, нажав "Далее"', options);
            })
            
        } else if (user && user.stage == 2) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": cinemas,
                    "one_time_keyboard" : true,
                    "resize_keyboard":true
                })
            };
            db.update({stage:3},{where: {userId:id}}).then (()=> {
                bot.sendMessage(chatId, 'Выберите кинотеатр', options)
            })
        }
    })
});

bot.onText(/\Ночь (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 1) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": [
                        [{ text: 'Утро 10:00-12:00'}, { text: 'День 12:00-17:00'}],
                        [{ text: 'Вечер 17:00-20:00'}, { text: 'Далее'}]
                    ],
                    "resize_keyboard":true
                })
            };
            db.update({stage: 2}, {where: {userId: id}}).then (user => {
                bot.sendMessage(chatId, 'Добавьте еще время или продолжите, нажав "Далее"', options);
            })
            
        } else if (user && user.stage == 2) {
            //ADD TIME CHOICE IN DB
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": cinemas,
                    "one_time_keyboard" : true,
                    "resize_keyboard":true
                })
            };
            db.update({stage:3},{where: {userId:id}}).then (()=> {
                bot.sendMessage(chatId, 'Выберите кинотеатр', options)
            })
        }
    })
});



bot.onText(/\Далее/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 2) {
            var options = {
                "parse_mode": "Markdown",
                "reply_markup": JSON.stringify({
                    "keyboard": cinemas,
                    "one_time_keyboard" : true,
                    "resize_keyboard":true
                })
            };
            db.update({stage:3},{where: {userId:id}}).then (()=> {
                bot.sendMessage(chatId, 'Выберите кинотеатр', options)
            })
        }
        
    })
});

bot.onText(/\Все/, (msg, match) => {
    const chatId = msg.chat.id;
    const id = msg.from.id;
    db.find({where: {userId: id}}). then(user => {
        if (user && user.stage == 3) {
            //ADD CINEMA CHOICE IN DB
            let seances = [];
            seances.push({
                id:1,
                cinema:'Космопарк',
                hall:'Зал 1',
                time: '11:10',
                price: '180c'
            });
            seances.push({
                id:2,
                cinema:'Бишкек парк',
                hall:'Зал 2',
                time: '12:20',
                price: '200c'
            });
            for (let i = 0; i< seances.length; i++) {
                message = seances[i].cinema + '\nЗал: ' + seances[i].hall + '\n' + seances[i].time + '\nСтоимость: ' + seances[i].price 
                bot.sendMessage(chatId, message, {
                    "reply_markup": {
                        "inline_keyboard": [
                            [
                                {
                                    text: "Купить",
                                    callback_data: seances[i].id,
                               } 
                            ],
                        ],
                    }
                })
            }
        }
    })
});