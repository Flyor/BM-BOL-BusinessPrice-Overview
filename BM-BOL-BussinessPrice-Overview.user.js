// ==UserScript==
// @name         BM Bol Overview 2.2
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Wenn nach bol.de gefiltert, Anzeige aktueller Preis abzgl. BusinessConditions mit Backup-Möglichkeit und Bildladefunktion
// @match        https://www.brickmerge.de/*fm=439*
// @updateURL    https://github.com/Flyor/BM-BOL-BusinessPrice-Overview/raw/refs/heads/main/BM-BOL-BusinessPrice-Overview.user.js
// @downloadURL  https://github.com/Flyor/BM-BOL-BusinessPrice-Overview/raw/refs/heads/main/BM-BOL-BusinessPrice-Overview.user.js
// @grant        none
// @author       Stonehiller Industries
// ==/UserScript==

(function() {
    'use strict';

    // ---------------------------
    // Funktion: Aktualisiert alle Lazy-Images im gesamten Dokument
    // ---------------------------
    function updateAllLazyImages() {
        var imgs = document.querySelectorAll('img');
        imgs.forEach(function(img) {
            var dataSrc = img.getAttribute('data-src');
            if (dataSrc && (img.src.indexOf('spacer.gif') !== -1 || !img.src)) {
                img.src = dataSrc;
                img.removeAttribute('data-src');
            }
        });
        window.dispatchEvent(new Event('scroll'));
    }

    // ---------------------------
    // Funktion: Reinitialisiert Tooltipster (falls jQuery und Tooltipster verfügbar sind)
    // ---------------------------
    function reinitializeTooltips() {
        try {
            if (typeof jQuery !== 'undefined' && typeof jQuery.fn.tooltipster === 'function') {
                jQuery('.tooltipster').tooltipster();
            }
        } catch(e) {
            console.warn("Tooltipster reinitialization fehlgeschlagen:", e);
        }
    }

    // ---------------------------
    // Funktion: Verarbeite eine einzelne Produktkachel (Slide)
    // ---------------------------
    function processSlide(slide) {
        var upperContainer = slide.querySelector('.productprice.productpricelist.merchantpricelist:not([itemprop="offers"])');
        if (!upperContainer) return;
        var offerBox = upperContainer.querySelector('.offerbox');
        if (!offerBox) return;

        // Erstelle ein Backup des ursprünglichen Preistextes
        offerBox.dataset.originalPriceText = offerBox.textContent;

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

        // "ohne Affiliate"-Button einfügen
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
            newButton.style.backgroundColor = 'blue';
            newButton.style.color = 'white';
            newButton.style.border = '1px solid blue';
            newButton.style.padding = '0.3rem 0.5rem';
            newButton.style.textDecoration = 'none';
            newButton.style.display = 'inline-block';
            newButtonContainer.appendChild(newButton);
            shopButtonContainer.insertAdjacentElement('afterend', newButtonContainer);
        }
        updateAllLazyImages();
        reinitializeTooltips();
    }

    // ---------------------------
    // Funktionen für den Filter (Preisvergleich)
    // ---------------------------
    function getBusinessPrice(slide) {
        var bpEl = slide.querySelector('.productprice.productpricelist.merchantpricelist:not([itemprop="offers"]) .offerbox .businessprice');
        if (bpEl) {
            var match = bpEl.textContent.match(/Business:\s*([\d,]+)/);
            if (match) {
                return parseFloat(match[1].replace(',', '.'));
            }
        }
        return null;
    }
    function getShopPrice(slide) {
        var spEl = slide.querySelector('.productprice.productpricelist.merchantpricelist[itemprop="offers"] .offerbox .theprice');
        if (spEl) {
            return parseFloat(spEl.textContent.replace('€','').trim().replace(',', '.'));
        }
        return null;
    }
    function updateFilter() {
        allSlides.forEach(function(slide) {
            if (!filterActive) {
                slide.style.display = "";
                slide.style.opacity = "1";
                return;
            }
            var bp = getBusinessPrice(slide);
            var sp = getShopPrice(slide);
            if (bp === null || sp === null) {
                slide.style.display = "";
            } else {
                if (bp < sp) {
                    slide.style.display = "";
                    slide.style.opacity = "1";
                } else {
                    slide.style.display = "none";
                }
            }
        });
    }

    // ---------------------------
    // "Alle Seiten laden" – Weitere Seiten per AJAX laden und in den Wrapper einfügen
    // ---------------------------
    async function loadAllPages() {
        var pagination = document.querySelector('.pagination');
        if (!pagination) {
            alert("Pagination nicht gefunden.");
            return;
        }
        var pageNumbers = Array.from(pagination.querySelectorAll('li a'))
            .map(a => parseInt(a.textContent))
            .filter(num => !isNaN(num));
        var maxPage = Math.max(...pageNumbers);
        if (maxPage <= 1) {
            alert("Es gibt nur eine Seite.");
            return;
        }
        loadPagesButton.disabled = true;
        loadPagesButton.textContent = "Lade Seiten…";
        var wrapperNormal = document.getElementById('wrappernormal');
        for (let p = 2; p <= maxPage; p++) {
            let url = `https://www.brickmerge.de/?fm=439&theme=Top-Angebote&page=${p}`;
            try {
                let response = await fetch(url);
                if (!response.ok) {
                    console.warn("Fehler beim Laden von Seite", p);
                    continue;
                }
                let text = await response.text();
                let parser = new DOMParser();
                let doc = parser.parseFromString(text, "text/html");
                let newWrapper = doc.querySelector('#wrappernormal');
                if (!newWrapper) continue;
                let newSlides = Array.from(newWrapper.querySelectorAll('.slide:not(.nextpage)'));
                newSlides.forEach(slide => {
                    processSlide(slide);
                    wrapperNormal.appendChild(slide);
                });
                await new Promise(r => setTimeout(r, 200));
            } catch (error) {
                console.error("Fehler beim Laden von Seite", p, error);
            }
        }
        window.dispatchEvent(new Event('scroll'));
        var paginationContainer = document.querySelector('.pagination-centered');
        if (paginationContainer) {
            paginationContainer.style.display = "none";
        }
        allSlides = Array.from(document.querySelectorAll('.slide:not(.nextpage)'));
        loadPagesButton.textContent = "Alle Seiten geladen";
        updateAllLazyImages();
    }

    // ---------------------------
    // Initiale Verarbeitung aller existierenden Slides
    // ---------------------------
    var allSlides = Array.from(document.querySelectorAll('.slide:not(.nextpage)'));
    allSlides.forEach(processSlide);

    // ---------------------------
    // Button "Alle Seiten laden" hinzufügen (oben, 50px nach unten versetzt)
    // ---------------------------
    var loadPagesButton = document.createElement('button');
    loadPagesButton.id = 'loadPagesButton';
    loadPagesButton.textContent = "Alle Seiten laden";
    loadPagesButton.style.position = 'fixed';
    loadPagesButton.style.top = '60px';
    loadPagesButton.style.right = '10px';
    loadPagesButton.style.zIndex = '9999';
    loadPagesButton.style.padding = '0.5rem 1rem';
    loadPagesButton.style.backgroundColor = 'blue';
    loadPagesButton.style.color = 'white';
    loadPagesButton.style.border = 'none';
    loadPagesButton.style.cursor = 'pointer';
    document.body.appendChild(loadPagesButton);
    loadPagesButton.addEventListener('click', loadAllPages);

    // ---------------------------
    // Toggle-Button für den Filter hinzufügen (unterhalb des Lade-Buttons)
    // ---------------------------
    var filterActive = false;
    var toggleButton = document.createElement('button');
    toggleButton.id = 'filterToggleButton';
    toggleButton.textContent = "Filter: Aus";
    toggleButton.style.position = 'fixed';
    toggleButton.style.top = '110px';
    toggleButton.style.right = '10px';
    toggleButton.style.zIndex = '9999';
    toggleButton.style.padding = '0.5rem 1rem';
    toggleButton.style.backgroundColor = 'blue';
    toggleButton.style.color = 'white';
    toggleButton.style.border = 'none';
    toggleButton.style.cursor = 'pointer';
    document.body.appendChild(toggleButton);
    toggleButton.addEventListener('click', function() {
        filterActive = !filterActive;
        toggleButton.textContent = filterActive ? "Filter: Ein" : "Filter: Aus";
        updateFilter();
    });

    // ---------------------------
    // MutationObserver hinzufügen, um Änderungen im DOM zu überwachen
    // ---------------------------
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList.contains('slide')) {
                        updateAllLazyImages();
                    }
                });
            }
        });
    });

    var productContainer = document.querySelector('#wrappernormal');
    if (productContainer) {
        observer.observe(productContainer, { childList: true, subtree: true });
    }

    updateAllLazyImages();
    updateFilter();

})();
