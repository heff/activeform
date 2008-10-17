// SETUP
// 1. Your form must have an ID, which is not included by defult in Rails, 
// you can do <% form_for :model, :html => { :id => "model" }, :url...
// 
// 2. The first class name for each field must be the name of the ActiveFormField type
// it should be set as. (class = "select" or class = "phone") See below for a list of
// available field types.
// 
// 3. Set the requirements for each form. If required, include a class name "required".
// The order doesn't matter as long as it's not first. (class = "text required")
// 
// 4. Create an instance of ActiveForm after the page loads. ( var bill = new ActiveForm(form_id); )
// The form id should probably be the same as the instance name.
// 
// That's it.
// 
// Now in your javascript on the page you can do fun stuff like:
// 
// Access and set the field value directly.
// The form ID is removed from the field id to create the attribute/field name.
// user.name("Steve") // Sets name as "Steve"
// user.name() // => "Steve" (don't forget the parenthesis () railsers')
// 
// Trigger events
// user.country_field.after_set = function(value) {
//   if(value = "USA") {
//     $('user_state_div').show();
//   }
// }
// 
// REFERENCING
// 
// Overview
// VALUE:    form.attribute();
// OBJECT:   form.attribute_field;
// ELEMENT:  form.attribute_field.element;
// 
// WRONG: user.name().after_set = function() {};
// form.attribute() is not the ActiveFormField object. It is just a getter/setter.
// 
// RIGHT: user.fields.name.after_set = function() {};
// form.fields.attribute is the ActiveFormField object
// 
// WRONG: user.fields.name.value;
// form.fields.attribute is not the actual input element, it is the ActiveFormField object
// 
// RIGHT: user.fields.name.element.value;
// 
// Though if you just want the value
// RIGHTER: user.name();

// NOTES
// 
// Choosing to go with the format of form.field.get() instead of
// form.attribute() and form.fields.field.get() because I'm finding my self using the field functions
// a lot more than I thougth I would.

var ActiveForm = Class.create({
  
  initialize: function(id) {
    // Requires an ID on <form>
    this.form_element = $(id);
    this.id = id;
    
    // Allows this form to be referenced in external functions
    this_form = this;
    
    // Loops through inputs in the form
    this.form_element.getElements().each(function(input){
      
      // Make sure the input has an ID
      if(input.id) {
        
        // First class name should be field type
        field_type = $w(input.className).first();
        
        // Make sure the type is know before creating
        if(field_type) { 
          // field_type = field_type.capitalize();
          
          // Strips the form ID from the field ID to make a clean name
          field_name = input.id.replace(this_form.id + "_", "");
          
          if($(input.id).hasClassName("make_hash")) {
            matches = field_name.match(/([^\d]+)_(\d+)_([^\d]+)/i);
            hash_name = matches[1]; hash_index = matches[2]; hash_item = matches[3];
            
            if(this_form[hash_name] == undefined) this_form[hash_name] = new Hash;
            if(this_form[hash_name].get(hash_index) == undefined) this_form[hash_name].set(hash_index, {});
            
            // Creates an ActiveFormField object for the field
            this_form[hash_name].get(hash_index)[hash_item] = new ActiveFormField[field_type](input.id);
            
            // Sets ActiveFormField to update itself on change
            eval("input.onchange = function() {"+
                this_form.id+"['"+hash_name+"'].get('"+hash_index+"')['"+hash_item+"'].self_set();"+
            "};");
            
          } else {   
            // Creates an ActiveFormField object for the field
            this_form[field_name] = new ActiveFormField[field_type](input.id);
            
            // Sets ActiveFormField to update itself on change
            eval("input.onchange = function() {"+
                this_form.id+"['"+field_name+"'].self_set();"+
            "};");
          }
          
          if(field_type == "radio") {
            name = input.readAttribute("name");
            if(name) {
              if(this_form[name] == undefined) this_form[name] = new ActiveFormField.radio_group(name);
              this_form[name].radios.push(this_form[field_name])
            }
          }
        } // end field_type check
      } // end ID check
    }); // end each    
  } // end initialize
}); // end ActiveForm


// ActiveForm Field
// Base class for all field classes
// Should not be instantiated itself
var ActiveFormField = {};

ActiveFormField.base = Class.create({

  initialize: function(id) {
    this.id = id;
    this.element = $(id);
    this.value = this.get_element_value();
    this.status_element = $(id+"_status");
    this.label = $$('label[for="'+id+'"]').first();
    this.required = this.element.hasClassName("required");
    this.default_valid_message = "";
  },

  set: function(new_value) {
    this.value = this.before_validate(new_value);
    this.validate();
    this.set_element_value(this.before_set(this.value));
    this.after_set(this.get());
  },
  
  get: function() { return this.before_get(this.get_element_value()); },
  
  // For use with onchange
  self_set: function() { this.set(this.get()); },
  
  // Allows override for different field value types
  set_element_value: function(value) { this.element.value = value; },
  get_element_value: function() { return this.element.value; },
  
  before_validate: function(value) { return value; }, 
  validate: function() { return true; },
  before_set: function(value) { return value; },
  after_set: function(value) { return value; },
  
  // Allows for formatting before use elsewhere
  before_get: function(value) { return value; },
  
  error: function(message) {
    this.set_status(false, message);
    return false;
  },
  
  valid: function(message) {
    this.set_status(true, message);
    return true;
  },
  
  // Show error and success messages near the field
  set_status: function(valid, message) {
    if(this.status_element != null) {
      if(message == undefined) message = "&nbsp;";
    
      if(valid) {
        this.status_element.removeClassName('error');
        this.status_element.addClassName('valid');
      } else {
        this.status_element.removeClassName('valid');
        this.status_element.addClassName('error');
      }
      this.status_element.innerHTML = message;
    }
  }
}); // end ActiveFormField


// Extends ActiveFormField
ActiveFormField.text = Class.create(ActiveFormField.base, {
  
  initialize: function($super, id) {
    $super(id); // Calls parent's initialize
    this.maxlength = this.element.readAttribute("maxlength");
    this.base_field_type = "text";
  },
  
  validate: function() {
    if(this.value == "" && this.required) {
      return this.error("Cannot be blank");
    } else if(this.maxlength > 0 && this.value.toString().length > this.maxlength) {
      // Probably not actaully needed, since browsers already limit
      return this.error("Must be less than "+this.maxlength+" characters.");
    } else {
      return this.valid();
    }
  }
});

// Extends ActiveTextField
ActiveFormField.number = Class.create(ActiveFormField.text, {
  
  initialize: function($super, id) {
    $super(id);
    this.round_to = this.get_round_to();
  },
  
  // Match round to number. External array ensures an array object is created.
  get_round_to: function() {
    return Number([this.element.className.match(/round_to_(\d+)/)].flatten()[1]);
  },
  
  before_get: function(value) {
    return this.clean_number(value);
  },
  
  before_validate: function(value) {
    return this.clean_number(value);
  },
  
  validate: function($super) {
    if(this.get() <= 0 && this.required) {
      return this.error("Must be greater than zero");
    }
    // Returns the parent validation
    return $super();
  },
  
  clean_number: function(num) {
    num = Number(num.toString().replace(/[^0-9\.]+/g, ""));
    num = (isNaN(num)) ? 0 : num;
    
    if(!isNaN(this.round_to)) {
      multiplier = Math.pow(10,this.round_to);
      num = Math.round(num * multiplier) / (1 * multiplier);
    }
    
    return num;
  }
});

// Extends ActiveNumberField
ActiveFormField.integer = Class.create(ActiveFormField.number, {
  // Could be set on initialize, but this prevents the regular expression
  get_round_to: function() {
    return 0;
  }
});


// Extends ActiveNumberField
ActiveFormField.amount = Class.create(ActiveFormField.number, {
  
  // Could be set on initialize, but this prevents the regular expression
  get_round_to: function() {
    return 2;
  },
  
  before_set: function(value) {
    return this.format_as_money(value);
  },

  format_as_money: function(amount) {
    amount = this.clean_number(amount);
    return (amount == Math.floor(amount)) ? amount + '.00' : ( (amount*10 == Math.floor(amount*10)) ? amount + '0' : amount);
  }

});

// Extends ActiveNumberField
ActiveFormField.select = Class.create(ActiveFormField.base, {
  initialize: function($super, id) {
    $super(id); // Calls parent's initialize
    this.base_field_type = "select";
  },
  
  validate: function() {
    if(this.value == "" && this.required) {
      return this.error("Cannot be blank");
    } else {
      return this.valid();
    }
  }
});

ActiveFormField.checkbox = Class.create(ActiveFormField.base, {
  initialize: function($super, id) {
    $super(id);
    this.base_field_type = "checkbox";
  },
  
  set_element_value: function(value) { 
    if(value) {
      this.element.checked = true;
    } else {
      this.element.checked = false;
    }
  },
  
  get_element_value: function() {
    return (this.element.checked) ? this.element.value : false;
  }
});

ActiveFormField.submit = Class.create(ActiveFormField.base, {});

ActiveFormField.hidden = Class.create(ActiveFormField.base, {});

ActiveFormField.radio = Class.create(ActiveFormField.checkbox, {});

ActiveFormField.radio_group = Class.create(ActiveFormField.base, {
  initialize: function(id) {
    this.radios = [];
    this.status_element = $(id+"_status");
  },
  
  // Return the selected radio's value. Protects against none selected.
  get_element_value: function() {
    curr_selected = this.radios.find(function(radio) { return radio.get(); });
    return (curr_selected) ? curr_selected.get() : false;
  }
  
  //Form.getInputs('myform','radio','type').find(function(radio) { return radio.checked; }).value
});





