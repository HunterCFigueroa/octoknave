import Knave2eItemType from "./item-type.mjs";

export default class Knave2eSpell extends Knave2eItemType {
  static DEFAULT_CATEGORY = "spell";

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.tier = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      max: 3
    });
    
    schema.proficiency = new fields.StringField({
      required: true,
      choices: ["Experimental", "Proficient", "Expert", "Master"],
      initial: "Experimental",
    });
    
    schema.essence = new fields.StringField({
      required: true,
      initial: "",
    });
    
    schema.staminaCost = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    
    schema.xpTicks = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0,
      max: 3
    });

    return schema;
  }
}