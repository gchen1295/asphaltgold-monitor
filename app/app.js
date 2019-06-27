const axios = require('axios')
const mongoose = require('mongoose')
const cheerio = require('cheerio')
const Products = require('./models/product')
const housecall = require('housecall')
let date = new Date()
let dateFormat = `${date.getFullYear()}-${date.getDay()}-${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
let queue = housecall({
  concurrency: 1,
  cooldown: 900
})

let devDB = `mongodb://127.0.0.1:27017/asphaltgold`
let prodDB = `mongodb://172.17.0.2/asphaltgold`

mongoose.connect(prodDB, {
    useNewUrlParser: true,
    useCreateIndex: true
})
mongoose.Promise = global.Promise;

var webHookURLs = [
    'https://discordapp.com/api/webhooks/593641508280729608/63yw9NFXVpOqwxLVQoyTt03GMrra3H7kKttpURkTNA2YGrqcv0ivVi_RPBlm9LA0LJot', //Test
    'https://discordapp.com/api/webhooks/593699375776137216/Zo2AqcHlnzzoEa6IfI7dZ2DvGnJDnPr3xzWjsEApUYvlWi49nTGcIWlNhn16VxiHe1Ud' // Doghouse
]

async function sendDicordWebhook(embedData) {
    for (url in webHookURLs) {
      queue.push(() => {
        axios.post(webHookURLs[url], embedData)
      })
        console.log('Message sent!')
    } 
}

docker run \
  --volume=/var/run/docker.sock:/var/run/docker.sock \
  --volume=/var/lib/drone:/data \
  --env=DRONE_GITHUB_SERVER=https://github.com \
  --env=DRONE_GITHUB_CLIENT_ID={% your-github-client-id %} \
  --env=DRONE_GITHUB_CLIENT_SECRET={% your-github-client-secret %} \
  --env=DRONE_RUNNER_CAPACITY=2 \
  --env=DRONE_SERVER_HOST={% your-drone-server-host %} \
  --env=DRONE_SERVER_PROTO={% your-drone-server-protocol %} \
  --env=DRONE_TLS_AUTOCERT=true \
  --publish=80:80 \
  --publish=443:443 \
  --restart=always \
  --detach=true \
  --name=drone \
  drone/drone:1

startmonitor()

function startmonitor() {
    setTimeout(async function () {
        axios.get('https://asphaltgold.de/en/sneaker')
            .then(data => {
                $ = cheerio.load(data.data)
                let links = []
                $('.item').children('a').each((i,e)=>{
                  let pLink = $(e).attr('href');
                  links.push(pLink);
                })
                for(link in links)
                {
                  let productTitle;
                  let productID;
                  let productSizes = [];
                  let productLink = links[link];
                  let productPrice;
                  //let productImage;
                  axios.get(links[link]).then(data=>{
                    $ = cheerio.load(data.data)
                    productTitle = $('span.attr-name').text();
                    productID = $('.regular-price').attr('id').split('-')
                    productID = productID.pop()
                    productPrice = $('.regular-price').text().replace(/\s+/g, '');
                    //productImage = $('.slide').children('a').eq(0).attr('href')
                    
                    $('.clearfix.shoesizes').children('ul').eq(0).children('li').each((i,e)=>{
                      let size = $(e).children('div').eq(0).text();
                      productSizes.push(size)
                    })
                    productSizes.splice(-1, 1)
                    productSizes.splice(-1, 1)
                    //console.log({productTitle, productID, productLink, productImage, productSizes, productPrice})
                    Products.findOne({productID: productID}).then((found)=>{
                    //console.log(found)
                    if(found === null)
                    {
                      try{
                        sendDicordWebhook({
                          embeds: [{
                              "color": 0xa350f9,
                              "title": `${productTitle} - New Product`,
                              "url": productLink,
                              "thumbnail": {
                                  "url": 'https://i.gyazo.com/4e7a4b6834400626ecf0a45d370e1f20.png'//productImage
                              },
                              "fields": [{
                                      "name": `Price:`,
                                      "value": productPrice,
                                      "inline": true
                                  },
                                  {
                                      "name": `Sizes`,
                                      "value": productSizes.join(' ')
                                  }
                              ],
                              "footer": {
                                  "icon_url": 'https://pbs.twimg.com/profile_images/1137456856102789120/mAGLqFyF_400x400.png',
                                  "text": `Powered By: Kex Software | ${dateFormat}`
                              }
                          }]
                      })
                      new Products({
                        _id: new mongoose.Types.ObjectId(),
                        productID: productID,
                        productTitle: productTitle,
                        productSizes: productSizes
                      }).save()
                      } catch(err){
                        console.log(err)
                      }
                    }else {
                      if (productSizes.filter(e => !found.productSizes.includes(e)).length != 0) {
                        console.log("Restock!")
                        sendDicordWebhook({
                            embeds: [{
                                color: 0xa350f9,
                                title: `${productTitle} - Restocked`,
                                url: productLink,
                                thumbnail: {
                                    url: 'https://i.gyazo.com/4e7a4b6834400626ecf0a45d370e1f20.png'//productImage
                                },
                                fields: [{
                                        name: `Price:`,
                                        value: productPrice,
                                        inline: true
                                    },
                                    {
                                        name: `Sizes`,
                                        value: productSizes.join(' ')
                                    }
                                ],
                                footer: {
                                    icon_url: 'https://pbs.twimg.com/profile_images/1137456856102789120/mAGLqFyF_400x400.png',
                                    text: `Powered By: Kex Software | ${dateFormat}`
                                }
                            }]
                        })
                        Products.findOneAndUpdate({
                            productID: productID
                        }, {
                          productSizes: productSizes
                        })
                    } else if (found.productSizes.filter(e => !productSizes.includes(e)).length != 0) {
                        Products.findOneAndUpdate({
                            productID: productID
                        }, {
                            productSizes: productSizes
                        })
                    }
                    }
                  })
                })
                }
                startmonitor()
            })
    }, 1500 )
}