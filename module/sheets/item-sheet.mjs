export default class Knave2eItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["knave2e", "sheet", "item"],
      width: 680,
      height: 400,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/knave2e/templates/item";
    let specificPath = `${path}/item-${this.item.type}-sheet.hbs`;
    
    return specificPath;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;
    context.system = itemData.system;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Prepare weapon data and items.
    if (itemData.type == "weapon") {
      this._prepareWeaponData(context);
    }

    // Prepare armor data and items.
    if (itemData.type == "armor") {
      this._prepareArmorData(context);
    }

    // Prepare spellbook data and items.
    if (itemData.type == "spellbook") {
      this._prepareSpellbookData(context);
    }

    if (itemData.type == "lightSource") {
      this._prepareLightSourceData(context);
    }

    if (itemData.type == "equipment") {
      this._prepareEquipmentData(context);
    }
    
    return context;
  }

  _prepareWeaponData(context) {
    context.weaponCategories = this._labelOptions(CONFIG.SYSTEM.WEAPON.CATEGORIES);
    context.ammoCategories = this._labelOptions(CONFIG.SYSTEM.AMMO.CATEGORIES);
    context.damageDiceCategories = CONFIG.SYSTEM.DAMAGE_DICE_SIZES;
    
    context.system.damageRoll = this._calculateDamageRoll(context);

    return context;
  }

  _prepareSpellbookData(context) {
    context.spellbookCategories = this._labelOptions(CONFIG.SYSTEM.SPELLBOOK.CATEGORIES);

    return context;
  }

  _prepareLightSourceData(context) {
    context.lightSourceCategories = this._labelOptions(CONFIG.SYSTEM.LIGHTSOURCE.CATEGORIES);

    return context;
  }

  _prepareEquipmentData(context) {

    return context;
  }

  _prepareArmorData(context) {
    context.armorCategories = this._labelOptions(CONFIG.SYSTEM.ARMOR.CATEGORIES);
  }

  // Convert CATEGORIES({id: "id", label: "label"}) to a selectOptions-compatible object
  _labelOptions(categories) {
    const returnObject = Object.keys(categories).reduce((result, key) => {
      result[key] = categories[key].label;
      return result;
    }, {});
    return returnObject;
  }

  _calculateDamageRoll(context){
    const roll = context.system;
    let damageRoll = "";
    if (roll.damageDiceBonus > 0){
      damageRoll = `${context.system.damageDiceAmount}${context.system.damageDiceSize}+${context.system.damageDiceBonus}`;
    }
    else if (roll.damageDiceBonus === 0){
      damageRoll = `${context.system.damageDiceAmount}${context.system.damageDiceSize}`;
    }
    else {
      damageRoll = `${context.system.damageDiceAmount}${context.system.damageDiceSize}${context.system.damageDiceBonus}`;
    }
    return damageRoll;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;
  }

  // async _onSubmit(event) {
  //   console.log(event)
  //   super._onSubmit(event)
  // }

}
