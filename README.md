# Mevn-orm

```javascript
   const { Model } = require('mevn-orm')

   class User extends Model {}

let columns = {
    name: 'John Doe',
    email: 'john@example.com',
    password: secret // remember to hash the password
}
User()
   .create(columns)
   .then(created => {
      // Do something after the creation
   })
   .catch(err => {
      // Handle the error
   })

// With aync await
const userId = await User.create(columns)
```

_Still under development hence not ready for production_
