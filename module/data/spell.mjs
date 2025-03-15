import Knave2eItemType from "./item-type.mjs";
import { SYSTEM } from "../config/system.mjs";

export default class Knave2eSpell extends Knave2eItemType {
  static DEFAULT_CATEGORY = "spell";

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Spell-specific fields
    schema.tier = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      max: 3
    });
    
    schema.proficiency = new fields.StringField({
      required: true,
      choices: ["experimental", "proficient", "expert"],
      initial: "experimental"
    });
    
    schema.essence = new fields.StringField({
      required: true,
      initial: ""
    });
    
    schema.staminaCost = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1
    });
    
    schema.isCast = new fields.BooleanField({ initial: false });

    return schema;
  }

  prepareBaseData() {
    // Base preparation
  }

  prepareDerivedData() {
    // Calculate any derived values
  }
}