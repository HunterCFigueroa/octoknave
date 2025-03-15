import Knave2eActorType from "./actor-type.mjs";
import { SYSTEM } from "../config/system.mjs";

export default class Knave2eCharacter extends Knave2eActorType {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.abilities = new fields.SchemaField(
      Object.values(SYSTEM.ABILITIES.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
          label: new fields.StringField({ initial: ability.label }),
          abbreviation: new fields.StringField({
            initial: ability.abbreviation,
          }),
          detail: new fields.StringField({ initial: ability.detail }),
        });
        return obj;
      }, {})
    );

    schema.ammo = new fields.SchemaField({
      arrow: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      bullet: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    });
    schema.armorPoints = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
    });
    schema.blessings = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    schema.careers = new fields.StringField({});
    schema.coins = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
    });
    schema.companions = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    schema.slots = new fields.SchemaField({
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: false,
        initial: 0,
        min: 0,
        step: 0.01,
      }),
      max: new fields.NumberField({
        required: true,
        nullable: false,
        integer: false,
        initial: 10,
        min: 0,
        step: 0.01,
      }),
    });
    schema.spells = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    
    // New Stamina system
    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      progress: new fields.NumberField({
        ...requiredInteger,
        initial: 100,
        min: 0,
      }),
    });
    
    schema.wounds = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 10,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      progress: new fields.NumberField({
        ...requiredInteger,
        initial: 100,
        min: 0,
      }),
    });
    
    // New XP tick system
    schema.xpTicks = new fields.SchemaField({
      ticks: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: 10 }),
      progress: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 100,
      }),
    });
    
    // Keep old xp for compatibility but phase out gradually
    schema.xp = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      progress: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 100,
      }),
    });
    
    // Essence tags for spellcasting
    schema.essences = new fields.StringField({ initial: "" });
    
    return schema;
  }

  prepareBaseData() {}
  
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Calculate stamina max based on empty inventory slots
    // Max stamina equals max slots minus used slots
    const emptySlots = Math.max(0, this.slots.max - this.slots.value);
    this.stamina.max = Math.floor(emptySlots);
    
    // Ensure stamina value doesn't exceed max
    if (this.stamina.value > this.stamina.max) {
      this.stamina.value = this.stamina.max;
    }
    
    // Calculate stamina progress percentage
    this.stamina.progress = this.stamina.max > 0 
      ? Math.floor((this.stamina.value / this.stamina.max) * 100)
      : 0;
    
    // Calculate XP ticks progress (for display)
    this.xpTicks.progress = this.xpTicks.ticks * 10;
  }
}