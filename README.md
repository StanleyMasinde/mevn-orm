# Mevn-orm

```javascript
   const { Model } = require('mevn-orm')

   class User extends Model {
       
   }

let columns = {
    name: 'John Doe',
    email: 'john@example.com',
    password: secrer // remember to hash the password
}
   new User().save(columns).then(created => {}).catch(err => {})
```

* By default the table for the user class is users,  Post Class posts etc to override this use `new User('table_name')`

_Still under development hence not ready for production_
