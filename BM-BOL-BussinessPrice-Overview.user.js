// ==UserScript==
// @name         BM Bol Overview
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Wenn nach bol.de gefiltert, Anzeige aktueller Preis abzgl. BusinessConditions
// @match        https://www.brickmerge.de/*fm=439*
// @updateURL    https://github.com/Flyor/BM-BOL-BusinessPrice-Overview/raw/refs/heads/main/BM-BOL-BusinessPrice-Overview.user.js
// @downloadURL  https://github.com/Flyor/BM-BOL-BusinessPrice-Overview/raw/refs/heads/main/BM-BOL-BusinessPrice-Overview.user.js
// @grant        none
// @author       Stonehiller Industries
// ==/UserScript==

(function() {
    'use strict';

    // Alle Produkt-Slides (ohne den "nextpage"-Button)
    var slides = document.querySelectorAll('.slide:not(.nextpage)');
    slides.forEach(function(slide) {
        // === Businesspreis + Rabatt im oberen Preisblock ===
        var upperContainer = slide.querySelector('.productprice.productpricelist.merchantpricelist:not([itemprop="offers"])');
        if (!upperContainer) return;
        var offerBox = upperContainer.querySelector('.offerbox');
        if (!offerBox) return;
        var hasCode = (offerBox.textContent.indexOf("[Code]") !== -1);
        offerBox.style.height = 'auto';

        var priceSpan = offerBox.querySelector('.theprice');
        if (!priceSpan) return;
        var priceText = priceSpan.textContent;
        var numberText = priceText.replace('€','').trim().replace(',', '.');
        var priceVal = parseFloat(numberText);
        if (isNaN(priceVal)) return;

        var businessVal = priceVal * 0.87;
        var businessPrice = businessVal.toFixed(2).toString().replace('.', ',');

        var lowerContainer = slide.querySelector('.productprice.productpricelist.merchantpricelist[itemprop="offers"]');
        var discountText = "";
        if (lowerContainer) {
            var uvpElement = lowerContainer.querySelector('.offerbox .small.stroke');
            if (uvpElement) {
                var uvpFullText = uvpElement.textContent;
                var uvpNumberText = uvpFullText.replace('UVP','').replace('€','').trim().replace(',', '.');
                var uvpVal = parseFloat(uvpNumberText);
                if (!isNaN(uvpVal) && uvpVal > 0) {
                    var discountPercent = Math.round(((uvpVal - businessVal) / uvpVal) * 100);
                    discountText = " (" + discountPercent + "%)";
                }
            }
        }

        var businessDiv = document.createElement('div');
        businessDiv.className = 'businessprice';
        businessDiv.textContent = "Business: " + businessPrice + " €" + discountText;
        businessDiv.style.fontWeight = 'bold';
        businessDiv.style.marginBottom = '0.3rem';
        businessDiv.style.color = 'blue';
        if (hasCode) {
            businessDiv.style.textDecoration = 'line-through';
        }
        priceSpan.parentNode.insertBefore(businessDiv, priceSpan);

        // === Neuer Button "ohne Affiliate" unter dem existierenden Shop-Button ===
        var shopButtonContainer = slide.querySelector('.pricerow.viewShop.pricerowlist:not(.allShops)');
        if (shopButtonContainer) {
            var newButtonContainer = document.createElement('div');
            newButtonContainer.className = "pricerow viewShop pricerowlist";
            newButtonContainer.style.marginBottom = "1rem";
            var newButton = document.createElement('a');
            var mpnElement = slide.querySelector('meta[itemprop="mpn"]');
            if (mpnElement) {
                var mpnValue = mpnElement.getAttribute('content');
                if (mpnValue) {
                    newButton.href = "https://www.bol.de/suche?sq=" + mpnValue;
                }
            }
            newButton.className = "tooltipster view tooltipstered";
            newButton.target = "_blank";
            newButton.textContent = "> ohne Affiliate";
            // Markierung 10: Button-Styling angepasst:
            newButton.style.backgroundColor = 'blue';
            newButton.style.color = 'white';
            newButton.style.border = '1px solid blue';
            newButton.style.padding = '0.3rem 0.5rem';
            newButton.style.textDecoration = 'none';
            newButton.style.display = 'inline-block';
            newButtonContainer.appendChild(newButton);
            shopButtonContainer.insertAdjacentElement('afterend', newButtonContainer);
        }
    });
})();
