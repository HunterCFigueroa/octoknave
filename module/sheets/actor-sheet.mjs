export default class Knave2eActorSheet extends ActorSheet {

    static get defaultOptions() {

        return mergeObject(super.defaultOptions, {
            classes: ["knave2e", "sheet", "actor"],
            template: "systems/knave2e/templates/actor/actor-sheet.hbs",
            width: 620,
            height: 650,
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "character" }]
        });
    }

    get template() {
        return `systems/knave2e/templates/actor/actor-${this.actor.type}-sheet.hbs`;
    }

    getData() {
        const context = super.getData();

        // Use a safe clone of the actor data for further operations.
        const actorData = this.actor.toObject(false);

        // Add the actor's data to context.data for easier access, as well as flags.
        context.system = actorData.system;
        context.flags = actorData.flags;

        // Prepare character data and items.
        if (actorData.type == 'character') {
            this._prepareCharacterData(context);
        }

        if (actorData.type == 'recruit') {
            this._prepareRecruitData(context);
        }

        if (actorData.type == 'monster') {
            this._prepareMonsterData(context);
        }

        // Add roll data for TinyMCE editors.
        context.rollData = context.actor.getRollData();

        console.log(context);
        return context;
    }

    _prepareCharacterData(context) {

        const systemData = context.system;

        const { hitPointsProgress, woundsProgress } = this._updateHealth(context);
        const { maxSlots, usedSlots } = this._updateSlots(context);
        const { armorPoints, armorClass } = this._updateArmor(context);
        const { currentLevel, progress } = this._updateLevelAndXP(systemData.xp.value);
        const activeBlessings = this._updateBlessings(context);

        systemData.hitPoints.progress = hitPointsProgress;
        systemData.wounds.progress = woundsProgress;
        systemData.slots.max = maxSlots;
        systemData.slots.value = usedSlots;
        systemData.armorPoints = armorPoints;
        systemData.armorClass = armorClass;
        systemData.level = currentLevel;
        systemData.xp.progress = progress;
        systemData.blessings.value = activeBlessings;

        this._updateLight(context);
    }

    _prepareRecruitData(context) {

        context.recruitCategories = this._labelOptions(CONFIG.SYSTEM.RECRUIT.CATEGORIES);
        context.rarityCategories = ({ "KNAVE2E.Common": "KNAVE2E.Common", "KNAVE2E.Uncommon": "KNAVE2E.Uncommon", "KNAVE2E.Rare": "KNAVE2E.Rare" });

        const systemData = context.system;

        const { maxSlots, usedSlots } = this._updateSlots(context);
        const { armorPoints, armorClass } = this._updateArmor(context);
        const hitPointsProgress = this._updateHealth(context);
        // const costPerMonthCategories = this._costOptions(CONFIG.SYSTEM.RECRUIT.CATEGORIES);

        systemData.hitPoints.progress = hitPointsProgress;
        systemData.slots.max = maxSlots;
        systemData.slots.value = usedSlots;
        systemData.armorPoints = armorPoints;
        systemData.armorClass = armorClass;

        this._updateRecruitCategoryDetails(context);
        this._updateLight(context);

    }

    _prepareMonsterData(context) {

        const systemData = context.system;

        const hitPointsProgress = this._updateHealth(context);
        systemData.hitPoints.progress = hitPointsProgress;
    }

    _updateSlots(context) {

        const systemData = context.system;
        let maxSlots;

        // Check max slots
        if (this.actor.type === "character") {
            maxSlots = 10 + systemData.abilities["constitution"].value - systemData.wounds.value;
        }
        else if (this.actor.type === "recruit") {
            maxSlots = 10;
        }

        // Sum item slots...
        const itemSlots = context.items.reduce((total, item) => {
            return total + item.system.slots;
        }, 0);

        // Sum coin slots
        const coinSlots = Math.ceil(systemData.coins / 500);

        // Sum ammo slots
        const ammoSlots = Math.ceil(systemData.ammo.arrow / CONFIG.SYSTEM.AMMO.CATEGORIES["arrow"].quantityPerSlot) + Math.ceil(systemData.ammo.bullet / CONFIG.SYSTEM.AMMO.CATEGORIES["bullet"].quantityPerSlot);

        // Add up used slots
        const usedSlots = itemSlots + coinSlots + ammoSlots;

        // If slots > max, start dropping items...
        if (usedSlots > maxSlots) {
            const overflowSlots = usedSlots - maxSlots;
            let slotCounter = 0; // count up to systemData.slots.value to derive how many discrete items to drop
            for (let i = 0; i < Math.min(overflowSlots, context.items.length); i++) {
                const currentItem = context.items[i];
                currentItem.system.dropped = true;

                // Make sure to account for multi-slot items
                slotCounter = slotCounter + currentItem.system.slots;
                if (slotCounter >= overflowSlots) {
                    break;
                }
            }
        }
        return { maxSlots, usedSlots }
    }

    _updateArmor(context) {
        const armorPieces = context.items.filter(i => i.type === "armor" && i.system.dropped === false);
        const uniqueCategories = [];
        let armorPoints = 0;

        const uniqueArmorPieces = armorPieces.filter(i => {
            if (!uniqueCategories.some(cat => cat === i.system.category)) {
                uniqueCategories.push(i.system.category);
                armorPoints = armorPoints + i.system.armorPoints;
                return true;
            }
            return false;
        });

        // const armorPoints = uniqueArmorPieces.length;
        // const armorClass = uniqueArmorPieces.length + 11;

        const armorClass = armorPoints + 11;

        return { armorPoints, armorClass }
    }

    _updateHealth(context) {
        const systemData = context.system;

        const hitPointsProgress = Math.floor((systemData.hitPoints.value / systemData.hitPoints.max) * 100);


        if (this.actor.type === 'recruit' || this.actor.type === 'monster') {
            return hitPointsProgress
        }

        else if (this.actor.type === 'character') {
            const woundsProgress = Math.floor(((systemData.wounds.max - systemData.wounds.value) / systemData.wounds.max) * 100);

            return { hitPointsProgress, woundsProgress }
        }
    }

    _updateBlessings(context) {
        const activeBlessings = context.items.filter(i => i.system.relic && i.system.relic.isActive && i.system.dropped === false);

        return activeBlessings.length
    }

    _updateLight(context) {
        const litItems = context.items.filter(i => i.type === 'lightSource' && i.system.lit === true && i.system.dropped === false);
        const token = this.actor.getActiveTokens()[0];

        if (token) {

            if (litItems.length > 0) {
                const brightestLight = litItems.reduce((prev, current) => (prev.system.dimRadius > current.system.dimRadius) ? prev : current);
                token.document.update({
                    light: {
                        dim: brightestLight.system.dimRadius,
                        bright: brightestLight.system.brightRadius,
                        animation: {
                            type: "torch",
                            speed: brightestLight.system.speed,
                            intensity: brightestLight.system.intensity
                        }
                    }
                });
            }

            else {
                token.document.update({
                    light: {
                        dim: 0,
                        bright: 0,
                        animation: {
                            type: "none",
                            speed: 5,
                            intensity: 5
                        }
                    }
                });
            }
        }
    }

    _updateRecruitCategoryDetails(context) {
        const systemData = context.system;

        const category = CONFIG.SYSTEM.RECRUIT.CATEGORIES[systemData.category];

        if (systemData.category === "hireling" || systemData.category === "mercenary") {
            systemData.costPerMonth = category.costPerMonth;
            systemData.morale = category.morale;
            systemData.rarity = "KNAVE2E.Common";
        }
        else if (systemData.category === "expert") {
            switch (systemData.rarity) {
                case "KNAVE2E.Common":
                    systemData.costPerMonth = 600;
                    systemData.morale = category.morale;
                    systemData.rarity = "KNAVE2E.Common";
                    break;
                case "KNAVE2E.Uncommon":
                    systemData.costPerMonth = 1200;
                    systemData.morale = category.morale;
                    systemData.rarity = "KNAVE2E.Uncommon";
                    break;
                case "KNAVE2E.Rare":
                    systemData.costPerMonth = 2400;
                    systemData.morale = category.morale;
                    systemData.rarity = "KNAVE2E.Rare";
                    systemData.spells.max = 1;
                    break;
            }
        }
    }

    // Convert CATEGORIES({id: "id", label: "label"}) to a selectOptions-compatible object
    _labelOptions(categories) {
        const returnObject = Object.keys(categories).reduce((result, key) => {
            result[key] = categories[key].label;
            return result;
        }, {});
        return returnObject;
    }

    // Convert CATEGORIES({id: "id", costPerMonth: cost}) to a selectOptions-compatible object
    _costOptions(categories) {
        const returnObject = Object.keys(categories).reduce((result, key) => {
            result[key] = categories[key].costPerMonth;
            return result;
        }, {});
        return returnObject;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Render the item sheet for viewing/editing prior to the editable check.
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            item.sheet.render(true);
        });

        // -------------------------------------------------------------
        // Everything below here is only needed if the sheet is editable
        if (!this.isEditable) return;

        // Add Inventory Item
        html.find('.item-create').click(this._onItemCreate.bind(this));

        // Delete Inventory Item
        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(li.data("itemId"));
            item.delete();
            li.slideUp(200, () => this.render(false));
        });

        // Active Effect management
        html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

        // Active Item management
        html.find(".item-control").click(this._toggleItemIcon.bind(this));

        // Monster Attacks
        html.find(".item-monster-roll").click(this._itemMonsterRoll.bind(this));

        // Rollable monster abilities
        html.find(".monster-roll").click(this._itemMonsterRoll.bind(this));

        // Rollable abilities.
        html.find('.rollable').click(this._onRoll.bind(this));

        // Rest button.
        html.find('.rest-button').click(this._rest.bind(this));

        // Check button.
        html.find('.check-button').click(this._check.bind(this));

        // Morale button.
        html.find('.morale-button').click(this._morale.bind(this));

        // Appearing button.
        html.find('.number-appearing-button').click(this._numberAppearing.bind(this));

        // Item Roll management
        html.find('.list-roll').click(this._itemRoll.bind(this));

        // Drag events for macros.
        if (this.actor.isOwner) {
            let handler = ev => this._onDragStart(ev);
            html.find('li.item').each((i, li) => {
                if (li.classList.contains("inventory-header")) return;
                li.setAttribute("draggable", true);
                li.addEventListener("dragstart", handler, false);
            });
        }
    }

    async _check(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const systemData = this.actor.system;

        let r = new Roll();
        let rollMod = 0;

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        rollMod = await Dialog.wait({
            title: "Check",
            content: "<h3 style=\"text-align:center;\">Add a bonus to this Check?</h3>", //todo: localize
            buttons: {
                standard: {
                    label: game.i18n.localize("KNAVE2E.Level"),
                    callback: () => { return systemData.level }
                },
                half: {
                    label: game.i18n.localize("KNAVE2E.HalfLevel"),
                    callback: () => { return Math.floor(systemData.level / 2) }
                },
                zero: {
                    label: game.i18n.localize("KNAVE2E.None"),
                    callback: () => { return 0 }
                },
            },
            default: 'standard',
            // close: () => { reject() },
        });

        r = new Roll("1d20 + @mod", { mod: rollMod });
        r.toMessage({
            speaker: speaker,
            flavor: `[Check] ${this.actor.name}: `, //@TODO: localize this
            rollMode: rollMode
        });
        return r
    }

    async _numberAppearing(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const systemData = this.actor.system;

        let r = new Roll();

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        
        if (a.dataset.action === "dungeon") {
            r = new Roll("@appearing", { appearing: systemData.numberAppearing.dungeon });
            await r.evaluate();
            r.toMessage({
                speaker: speaker,
                flavor: `${r.total} ${this.actor.name}(s) appear in the dungeon...`, //@TODO: localize this
                rollMode: rollMode
            });
        }
        else {
            r = new Roll("@appearing", { appearing: systemData.numberAppearing.wilderness });
            await r.evaluate();
            r.toMessage({
                speaker: speaker,
                flavor: `${r.total} ${this.actor.name}(s) appear in the nearby wilderness...`, //@TODO: localize this
                rollMode: rollMode
            });
        }
    }

    async _itemMonsterRoll(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const systemData = this.actor.system;

        // Find closest <li> element containing a "data-item-id" attribute
        const li = a.closest("li");
        const item = li.dataset.itemId ? this.actor.items.get(li.dataset.itemId) : null;

        // console.log(item);
        let r = new Roll();
        let rollMod = systemData.level;

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        switch (a.dataset.action) {
            case "attack-roll":
                rollMod = await Dialog.wait({
                    title: "Attack Bonus",
                    content: "<h3 style=\"text-align:center;\">Add a bonus to this Attack?<h3>",//todo: localize
                    buttons: {
                        standard: {
                            label: game.i18n.localize("KNAVE2E.Level"),
                            callback: () => { return systemData.level }
                        },
                        half: {
                            label: game.i18n.localize("KNAVE2E.HalfLevel"),
                            callback: () => { return Math.floor(systemData.level / 2) }
                        },
                        zero: {
                            label: game.i18n.localize("KNAVE2E.None"),
                            callback: () => { return 0 }
                        },
                    },
                    default: 'standard',
                    // close: () => { reject() },
                });

                r = new Roll("1d20 + @mod", { mod: rollMod });
                r.toMessage({
                    speaker: speaker,
                    flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                    rollMode: rollMode
                });
                return r
            case "damage-roll":
                r = new Roll("@damage", { damage: item.system.damageRoll });
                r.toMessage({
                    speaker: speaker,
                    flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                    rollMode: rollMode
                });
                return r
            default:
                break
        }
    }

    // _updateXPProgressBar() {
    //     const progress = this.getData().system.xp.progress;
    //     const xpProgressBar = $('#xp-progress-bar');
    //     const xpProgressValue = $('#xp-progress-value');

    //     xpProgressValue.css({
    //         'width': progress + '%',
    //         'background-color': 'red'
    //     });
    // }

    async _onItemCreate(event) {
        event.preventDefault();

        let itemType;

        if (this.actor.type === 'monster') {
            itemType = "monsterAttack";
        }

        else {
            // Get the type of item to create.
            itemType = await Dialog.wait({
                title: "Create New Item",
                content: "Choose an Item Type:", //todo: localize
                buttons: {
                    armor: {
                        label: game.i18n.localize("KNAVE2E.Armor"),
                        callback: () => { return "armor" }
                    },
                    equipment: {
                        label: game.i18n.localize("KNAVE2E.Equipment"),
                        callback: () => { return "equipment" }
                    },
                    lightSource: {
                        label: game.i18n.localize("KNAVE2E.LightSource"),
                        callback: () => { return "lightSource" }
                    },
                    spellbook: {
                        label: game.i18n.localize("KNAVE2E.Spellbook"),
                        callback: () => { return "spellbook" }
                    },
                    weapon: {
                        label: game.i18n.localize("KNAVE2E.Weapon"),
                        callback: () => { return "weapon" }
                    },
                },
                default: 'weapon',
                // close: () => { reject() },
            });
        }

        const header = event.currentTarget;
        // Grab any data associated with this control.
        const data = duplicate(header.dataset);
        // Initialize a default name.
        const name = `New ${itemType.capitalize()}`;
        // Prepare the item object.
        const itemData = {
            name: name,
            type: itemType,
            system: data
        };
        // Remove the type from the dataset since it's in the itemData.type prop.
        delete itemData.system["type"];

        // Finally, create the item!
        return await Item.create(itemData, { parent: this.actor });
    }

    _toggleItemIcon(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const systemData = this.actor.system;

        // Find closest <li> element containing a "data-item-id" attribute
        const li = a.closest("li");
        const item = li.dataset.itemId ? this.actor.items.get(li.dataset.itemId) : null;

        // console.log(item);

        switch (a.dataset.action) {
            case "toggle-break":
                return item.update({ "system.broken": !item.system.broken })
            case "toggle-cast":
                return item.update({ "system.cast": !item.system.cast })
            case "toggle-blessing":
                if (item.system.relic.isActive) {
                    this.actor.update({
                        "system.blessings.value": systemData.blessings.value - 1
                    });
                    return item.update({ "system.relic.isActive": false })
                }
                else if (systemData.blessings.value < systemData.blessings.max) {
                    this.actor.update({
                        "system.blessings.value": systemData.blessings.value + 1
                    });
                    return item.update({ "system.relic.isActive": !item.system.relic.isActive })
                }
                else if (systemData.blessings.value >= systemData.blessings.max) {
                    return
                }
            case "toggle-light":
                return item.update({ "system.lit": !item.system.lit })
            default:
                break
        }
    }

    _levelCheck(event) {
        event.preventDefault();
        const systemData = this.actor.system;

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        let r = new Roll();
        let rollMod;

        if (event.shiftKey) {
            rollMod = Math.floor(systemData.level / 2);
            r = new Roll("1d20 + @mod", { mod: rollMod });
            r.toMessage({
                speaker: speaker,
                flavor: `Roll with half level:`, //@TODO: localize this
                rollMode: rollMode
            });
        }
        else {
            rollMod = systemData.level;
            r = new Roll("1d20 + @mod", { mod: rollMod });
            r.toMessage({
                speaker: speaker,
                flavor: `Standard Check:<br/>
                (Shift + Click to roll with half level)`, //@TODO: localize this
                rollMode: rollMode
            });
        }
    }

    async _morale(event) {
        event.preventDefault();
        const systemData = this.actor.system;

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        let r = new Roll("2d6");
        await r.evaluate();
        if (r.total > systemData.morale) {
            r.toMessage({
                speaker: speaker,
                flavor: `Morale Test Failed!.`, //@TODO: localize this
                rollMode: rollMode
            });
        }
        else {
            r.toMessage({
                speaker: speaker,
                flavor: `Morale Test Succeeded!.`, //@TODO: localize this
                rollMode: rollMode
            });
        }
    }

    _itemRoll(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const systemData = this.actor.system;

        // Find closest <li> element containing a "data-item-id" attribute
        const li = a.closest("li");
        const item = li.dataset.itemId ? this.actor.items.get(li.dataset.itemId) : null;

        // console.log(item);
        let r = new Roll();
        let rollMod = 0;

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        if (this.actor.type === "character") {
            switch (a.dataset.action) {
                case "attack-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot attack with a broken weapon. Repair or replace this weapon to roll an attack.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        if (item.system.category === 'melee') {
                            rollMod = systemData.abilities.strength.value;
                            r = new Roll("1d20 + @mod", { mod: rollMod });
                            r.toMessage({
                                speaker: speaker,
                                flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                rollMode: rollMode
                            });
                            this._checkWeaponBreak(r, item);
                            return r
                        }
                        else if (item.system.category === 'ranged') {
                            rollMod = systemData.abilities.wisdom.value;
                            const ammoType = item.system.ammoType;

                            if (ammoType === "none") {
                                r = new Roll("1d20 + @mod", { mod: rollMod });
                                r.toMessage({
                                    speaker: speaker,
                                    flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                    rollMode: rollMode
                                });
                                this._checkWeaponBreak(r, item);
                                return r
                            }
                            else {
                                if (ammoType === "arrow" && systemData.ammo[ammoType] >= 1) {
                                    this.actor.update({
                                        "system.ammo.arrow": systemData.ammo.arrow - 1
                                    });
                                    r = new Roll("1d20 + @mod", { mod: rollMod });
                                    r.toMessage({
                                        speaker: speaker,
                                        flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                        rollMode: rollMode
                                    });
                                    this._checkWeaponBreak(r, item);
                                    return r
                                }
                                else if (ammoType === "bullet" && systemData.ammo[ammoType] >= 1) {
                                    this.actor.update({
                                        "system.ammo.bullet": systemData.ammo.bullet - 1
                                    });
                                    r = new Roll("1d20 + @mod", { mod: rollMod });
                                    r.toMessage({
                                        speaker: speaker,
                                        flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                        rollMode: rollMode
                                    });
                                    this._checkWeaponBreak(r, item);
                                    return r
                                }
                                else {
                                    ChatMessage.create({
                                        speaker: speaker,
                                        flavor: `${item.name} is out of ${item.system.ammoType}s!`,
                                        content: "Cannot attack without ammo.", //@Todo: localize this
                                        rollMode: rollMode
                                    });
                                    break
                                }
                            }
                        }
                    }

                case "damage-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot roll damage with a broken weapon. Repair or replace this weapon to roll damage.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        r = new Roll("@damage", { damage: item.system.damageRoll });
                        r.toMessage({
                            speaker: speaker,
                            flavor: `Damage from ${item.name}: `, //@TODO: localize this
                            rollMode: rollMode
                        });
                        return r
                    }

                case "direct-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot roll direct damage with a broken weapon. Repair or replace this weapon to roll direct damage.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        r = new Roll("(@damage) * 3", { damage: item.system.damageRoll });
                        r.toMessage({
                            speaker: speaker,
                            flavor: `Direct Damage from ${item.name}: `, //@TODO: localize this
                            rollMode: rollMode
                        });
                        return r
                    }

                case "cast":
                    if (systemData.abilities.intelligence.value < 1) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} cannot be used!`,
                            content: "You need INT > 0 to cast spells from a spellbook.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        {
                            if (item.system.cast) {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `${item.name} has already been cast!`,
                                    content: "A spellbook can only be used once between rests.", //@Todo: localize this
                                    rollMode: rollMode
                                });
                                break
                            }
                            else if (systemData.spells.value >= systemData.spells.max) {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `Cannot use another spellbook!`,
                                    content: `${this.actor.name} can only cast up to ${systemData.spells.max} spells between rests.`, //@Todo: localize this
                                    rollMode: rollMode
                                });
                                break
                            }
                            else {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `Casting ${item.name}: `,
                                    content: item.system.description,
                                    rollMode: rollMode
                                });
                                item.update({
                                    "system.cast": true
                                });
                                this.actor.update({
                                    "system.spells.value": systemData.spells.value + 1
                                });
                                break
                            }
                        }
                    }

                default:
                    break

            }
        } else if (this.actor.type === "recruit") {
            switch (a.dataset.action) {
                case "attack-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot attack with a broken weapon. Repair or replace this weapon to roll an attack.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        if (item.system.category === 'melee') {
                            rollMod = systemData.level;
                            r = new Roll("1d20 + @mod", { mod: rollMod });
                            r.toMessage({
                                speaker: speaker,
                                flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                rollMode: rollMode
                            });
                            this._checkWeaponBreak(r, item);
                            return r
                        }
                        else if (item.system.category === 'ranged') {
                            rollMod = systemData.level;
                            const ammoType = item.system.ammoType;

                            if (ammoType === "none") {
                                r = new Roll("1d20 + @mod", { mod: rollMod });
                                r.toMessage({
                                    speaker: speaker,
                                    flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                    rollMode: rollMode
                                });
                                this._checkWeaponBreak(r, item);
                                return r
                            }
                            else {
                                if (ammoType === "arrow" && systemData.ammo[ammoType] >= 1) {
                                    this.actor.update({
                                        "system.ammo.arrow": systemData.ammo.arrow - 1
                                    });
                                    r = new Roll("1d20 + @mod", { mod: rollMod });
                                    r.toMessage({
                                        speaker: speaker,
                                        flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                        rollMode: rollMode
                                    });
                                    this._checkWeaponBreak(r, item);
                                    return r
                                }
                                else if (ammoType === "bullet" && systemData.ammo[ammoType] >= 1) {
                                    this.actor.update({
                                        "system.ammo.bullet": systemData.ammo.bullet - 1
                                    });
                                    r = new Roll("1d20 + @mod", { mod: rollMod });
                                    r.toMessage({
                                        speaker: speaker,
                                        flavor: `Attacking with ${item.name}: `, //@TODO: localize this
                                        rollMode: rollMode
                                    });
                                    this._checkWeaponBreak(r, item);
                                    return r
                                }
                                else {
                                    ChatMessage.create({
                                        speaker: speaker,
                                        flavor: `${item.name} is out of ${item.system.ammoType}s!`,
                                        content: "Cannot attack without ammo.", //@Todo: localize this
                                        rollMode: rollMode
                                    });
                                    break
                                }
                            }
                        }
                    }

                case "damage-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot roll damage with a broken weapon. Repair or replace this weapon to roll damage.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        r = new Roll("@damage", { damage: item.system.damageRoll });
                        r.toMessage({
                            speaker: speaker,
                            flavor: `Damage from ${item.name}: `, //@TODO: localize this
                            rollMode: rollMode
                        });
                        return r
                    }

                case "direct-roll":
                    if (item.system.broken) {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} is Broken!`,
                            content: "Cannot roll direct damage with a broken weapon. Repair or replace this weapon to roll direct damage.", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        r = new Roll("(@damage) * 3", { damage: item.system.damageRoll });
                        r.toMessage({
                            speaker: speaker,
                            flavor: `Direct Damage from ${item.name}: `, //@TODO: localize this
                            rollMode: rollMode
                        });
                        return r
                    }

                case "cast":
                    if (systemData.rarity !== "rare") {
                        ChatMessage.create({
                            speaker: speaker,
                            flavor: `${item.name} cannot be used!`,
                            content: "Only Rare Experts can cast spells!", //@Todo: localize this
                            rollMode: rollMode
                        });
                        break
                    }
                    else {
                        {
                            if (item.system.cast) {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `${item.name} has already been cast!`,
                                    content: "A spellbook can only be used once between rests.", //@Todo: localize this
                                    rollMode: rollMode
                                });
                                break
                            }
                            else if (systemData.spells.value >= systemData.spells.max) {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `Cannot use another spellbook!`,
                                    content: `${this.actor.name} can only cast up to ${systemData.spells.max} spells between rests.`, //@Todo: localize this
                                    rollMode: rollMode
                                });
                                break
                            }
                            else {
                                ChatMessage.create({
                                    speaker: speaker,
                                    flavor: `Casting ${item.name}: `,
                                    content: item.system.description,
                                    rollMode: rollMode
                                });
                                item.update({
                                    "system.cast": true
                                });
                                this.actor.update({
                                    "system.spells.value": systemData.spells.value + 1
                                });
                                break
                            }
                        }
                    }

                default:
                    break

            }
        }
    }

    _checkWeaponBreak(r, item) {
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        // console.log(r.terms);
        const naturalRoll = r.terms[0].results[0].result;

        if (naturalRoll === 1) {
            item.update({
                "system.broken": true
            });
            ChatMessage.create({
                speaker: speaker,
                flavor: `${item.name} has broken!`,
                content: "Weapons break on a natural 1. Time to repair or replace this weapon!", //@Todo: localize this
                rollMode: rollMode
            });
        }
    }

    _roll(event, dataset) {
        if (event.shiftKey) {
            console.log("Shift Click!"); // @TODO: Add optional modifier pop-up
        }
        else {
            let label = dataset.label ?
                `[${game.i18n.localize("KNAVE2E.Check")}]
              ${game.i18n.localize(dataset.label)}` : '';
            let roll = new Roll(dataset.roll, this.actor.getRollData());

            roll.toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: game.i18n.localize(label),
                rollMode: game.settings.get('core', 'rollMode'),
            });
            return roll;
        }
    }

    async _rest(event) {
        event.preventDefault();
        const systemData = this.actor.system;

        let spellbookChanges = this.actor.items.filter(i => i.type === 'spellbook').map(i => ({ _id: i.id, 'system.cast': false }))
        this.actor.updateEmbeddedDocuments('Item', spellbookChanges)

        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');

        const restoredHP = systemData.hitPoints.max - systemData.hitPoints.value;

        if (this.actor.type === "recruit") {
            return this.actor.update({
                "system.hitPoints.value": systemData.hitPoints.max,
                "system.spells.value": 0,
            });
        }

        else {
            const restType = await Dialog.wait({
                title: "Select Rest Option",
                content: "<h3 style=\"text-align:center;\">To rest, eat a meal & sleep at least two watches.</h3><p style=\"text-align:center;\">Resting in a safe haven additionally restores 1 Wound.</p>", //todo: localize
                buttons: {
                    standard: {
                        label: game.i18n.localize("KNAVE2E.Standard"),
                        callback: () => { return "standard" }
                    },
                    safe: {
                        label: game.i18n.localize("KNAVE2E.SafeHaven"),
                        callback: () => { return "safe" }
                    }
                },
                default: 'standard',
                // close: () => { reject() },
            });

            if (restType === 'standard') {
                return this.actor.update(
                    {
                        "system.hitPoints.value": systemData.hitPoints.max,
                        "system.spells.value": 0,
                    });
            }
            else if (restType === 'safe') {
                return this.actor.update(
                    {
                        "system.hitPoints.value": systemData.hitPoints.max,
                        "system.wounds.value": Math.max(systemData.wounds.value - 1, 0),
                        "system.spells.value": 0,
                    });
            }
        }
    }

    _onRoll(event) {
        // event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        //("Roll Data:");
        //console.log(this.actor.getRollData());

        //console.log("dataset.roll");
        //console.log(dataset.roll);

        // Handle item rolls.
        if (dataset.rollType) {
            if (dataset.rollType == 'item') {
                const itemId = element.closest('.item').dataset.itemId;
                const item = this.actor.items.get(itemId);
                if (item) return item.roll();
            }
        }

        // Handle plain-text roll formulas
        if (dataset.roll) {
            if (event.shiftKey) {
                //console.log("Shift Click!"); // @TODO: Add optional modifier pop-up
            }
            else {
                let label = dataset.label ?
                    `[${game.i18n.localize("KNAVE2E.Check")}]
                  ${game.i18n.localize(dataset.label)}` : '';
                let roll = new Roll(dataset.roll, this.actor.getRollData());

                roll.toMessage({
                    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                    flavor: game.i18n.localize(label),
                    rollMode: game.settings.get('core', 'rollMode'),
                });
                return roll;
            }
        }
    }

    _updateLevelAndXP(xp) {
        let currentLevel = 1;
        let progress = 0;

        switch (true) {
            case xp >= 0 && xp < 2000:
                currentLevel = 1;
                progress = Math.floor((xp / 2000) * 100);
                break;
            case xp >= 2000 && xp < 4000:
                currentLevel = 2;
                progress = Math.floor(((xp - 2000) / 2000) * 100);
                break;
            case xp >= 4000 && xp < 8000:
                currentLevel = 3;
                progress = Math.floor(((xp - 4000) / 4000) * 100);
                break;
            case xp >= 8000 && xp < 16000:
                currentLevel = 4;
                progress = Math.floor(((xp - 8000) / 8000) * 100);
                break;
            case xp >= 16000 && xp < 32000:
                currentLevel = 5;
                progress = Math.floor(((xp - 16000) / 16000) * 100);
                break;
            case xp >= 32000 && xp < 64000:
                currentLevel = 6;
                progress = Math.floor(((xp - 32000) / 32000) * 100);
                break;
            case xp >= 64000 && xp < 125000:
                currentLevel = 7;
                progress = Math.floor(((xp - 64000) / 61000) * 100);
                break;
            case xp >= 125000 && xp < 250000:
                currentLevel = 8;
                progress = Math.floor(((xp - 125000) / 125000) * 100);
                break;
            case xp >= 250000 && xp < 500000:
                currentLevel = 9;
                progress = Math.floor(((xp - 250000) % 250000) * 100);
                break;
            case xp >= 500000:
                currentLevel = 10;
                progress = 100;
                break;
            default:
                currentLevel = 1;
                progress = 0;
                break;
        }
        return { currentLevel, progress };
    }
}