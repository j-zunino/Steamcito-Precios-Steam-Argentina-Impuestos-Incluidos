const walletBalance = getBalance();
const totalTaxes = getTotalTaxes();

function getPrices(){
    let prices = document.querySelectorAll(priceContainers);
    
    // Fix específico para obtener las DLCs sin descuento y que estas no hagan overlap con las DLCs con descuento
    let standardDlcPrices = document.querySelectorAll(`.game_area_dlc_price:not([${attributeName}]`);
    standardDlcPrices.forEach(dlcPrice => { 
        if(!dlcPrice.querySelector("div")){
            setArgentinaPrice(dlcPrice);
        }
    });
    prices.forEach(price => setArgentinaPrice(price));
}

async function setArgentinaPrice(price){
    let exchangeRate = JSON.parse(localStorage.getItem('steamcito-cotizacion')).rate;

        // Ignoro los juegos sin precio (Ejemplo: F2Ps)
        if(price.innerText.includes('$')){
            let baseNumericPrice = extractNumberFromString(price.innerText)
            price.dataset.originalPrice = baseNumericPrice;
            price.dataset.argentinaPrice = calculateTaxesAndExchange(baseNumericPrice,exchangeRate);
            renderPrices(price);
        }

}

function sanitizePromoLists() {
    let items = document.querySelectorAll('.promo_item_list .price br');
    items.forEach(item => item.remove());
}

function renderPrices(price) {
    let argentinaPrice = numberToString(price.dataset.argentinaPrice);
    let originalPrice = numberToStringUsd(price.dataset.originalPrice);

    price.addEventListener('click', showSecondaryPrice);
    price.style.cursor = "pointer";   

    // Fix para contenedores que intercalan un BR entre precio original y precio en oferta 
    price.classList.contains("was") && sanitizePromoLists();



    // Si el saldo te alcanza para comprar el juego
    if(walletBalance > parseFloat(price.dataset.originalPrice)){

        price.innerHTML = DOMPurify.sanitize(originalPrice + emojiWallet);
        price.classList.add("original");

        if (price.previousElementSibling) {
            if(isInsideString(price.previousElementSibling,"$")){
                price.previousElementSibling.classList.add('original');
                price.previousElementSibling.classList.remove('argentina');
                price.previousElementSibling.innerText = numberToStringUsd(price.previousElementSibling.dataset.originalPrice); 
            }
        }
        
    }
    else {
        price.innerHTML = DOMPurify.sanitize(argentinaPrice + emojiMate);
        price.classList.add("argentina");

        // Si tiene un descuento
        if (price.previousElementSibling) {
            if(isInsideString(price.previousElementSibling,"$")){
                price.previousElementSibling.classList.remove('original');
                price.previousElementSibling.classList.add('argentina');
                price.previousElementSibling.innerText = numberToString(price.previousElementSibling.dataset.argentinaPrice); 
            }
        }
        
    }

    // Fix para reprocesar bundles dinámicos cuyo precio se carga de manera asíncrona
    setTimeout(function(){

        if(price.classList.contains('argentina') && !price.innerText.includes("ARS") && price.closest('.dynamic_bundle_description')){
            setArgentinaPrice(price);
        }

        if(price.classList.contains('original') && !price.innerText.includes(emojiWallet) && price.closest('.dynamic_bundle_description')){
            setArgentinaPrice(price);
        }

    },1500)

}

function showSecondaryPrice(e){
    e.preventDefault();
    let selectedPrice = e.currentTarget;
    selectedPrice.classList.add("transition-effect");
    selectedPrice.style.opacity = 0;
    if(selectedPrice.classList.contains("argentina")){
        switchPrices(selectedPrice,"argentina","original",emojiWallet);
    }
    else if(selectedPrice.classList.contains("original")){
        switchPrices(selectedPrice,"original","argentina",emojiMate);
    }
}


function switchPrices(selector,first,second,symbol){
    setTimeout(function(){
        selector.style.opacity=1;
        selector.classList.remove(first);
        selector.classList.add(second);

        if(selector.classList.contains("suscription-price")){
            selector.innerHTML = DOMPurify.sanitize(numberToStringSub(selector.dataset[second+"Price"] + symbol));
        } else{
            selector.innerHTML = first == "argentina" ? numberToStringUsd(selector.dataset[second+"Price"] + symbol) : DOMPurify.sanitize(numberToString(selector.dataset[second+"Price"] + symbol))  ;
        }            
    },250);
}

function evaluateDate(){
    if(localStorage.getItem('steamcito-cotizacion')){
        let exchangeRateJSON = JSON.parse(localStorage.getItem('steamcito-cotizacion'))

        let savedTimestamp = parseInt(exchangeRateJSON.date) / 1000;
        let currentTimestamp = Date.now()/1000;
        let difference = currentTimestamp - savedTimestamp;

        if(difference >= 3600){
            return true;
        } else{
            return false;
        }
    }
    return true;
}

async function getUsdExchangeRate(){

    let shouldGetNewRate = evaluateDate();

    if(shouldGetNewRate){
        try{
            let exchangeRateResponse = await fetch('https://mercados.ambito.com/dolar/oficial/variacion');
            let exchangeRateJson = await exchangeRateResponse.json();
            let exchangeRate = exchangeRateJson.venta;
            let exchangeRateDate = exchangeRateJson.fecha
            exchangeRate = parseFloat(exchangeRate.replace(',','.'));
            
            let exchangeRateJSON = {
                rate : exchangeRate,
                rateDateProvided: exchangeRateDate,
                date: Date.now()
            }

    
        localStorage.setItem('steamcito-cotizacion', JSON.stringify(exchangeRateJSON));
        }
        catch(err){
            localStorage.setItem('steamcito-cotizacion', JSON.stringify({
                rate:851.01,
                rateDateProvided:"02/02/2024 - 15:57",
                date:1704237682000
            }));
        }


    }
}

let currentDate = new Date();
const hoy = {
			day: currentDate.getDate(),
			month: currentDate.getMonth()+1,
			year: currentDate.getFullYear()
};

// Pasa de un stirng de iniciales de un mes al número de mes. Ejemplo: AGO (Agosto) será 8
function monthStrToNumber(month)
{
    if(month.indexOf(',')){
        let commaPosition = month.indexOf(',');
        let monthSanitized = commaPosition != -1 ? (month.slice(0,commaPosition)).toUpperCase() : month.toUpperCase();
        return ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].indexOf(monthSanitized) + 1;
    } else{
        return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"].indexOf(month) + 1;
    }
}

// Pasa de un string del formato 15 ENE 2023 a un json { day:15, month:1, year:2023}
function stringToDate(dateStr)
{
	let dateArr = dateStr.split(" ");
	return {
		day:Number(dateArr[0]),
		month:monthStrToNumber(dateArr[1]),
		year:Number(dateArr[2])
	};
}
