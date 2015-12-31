/**
 *  Helper functions on Arrays
 */

/**
 *  Remove a given value, possibly several times, from an array
 *  WARNING: Does NOT work with associative arrays!
 */
function removeFromArray( array, value )
{
    if (!array || !array.length || !value) {
        console.warn('Warning in removeFromArray: array=[%s], value=[%s]', array, value);
        return;
    }
    // Remove all the elements === value from array
    for (var pos = 0; pos >= 0; ) {
        pos = array.indexOf( value, pos );
        if (pos >= 0)
            array.splice( pos, 1 );
    }
    return;
}



/**
 *  Remove a given Object, possibly several times, from an array
 *  WARNING: Does NOT work with associative arrays!
 */
function removeObjectFromArray( array, objectVal )
{
    if (!array || !array.length || !objectVal || Object.keys( objectVal ).length < 1 ) {
        console.warn('Warning in removeObjectFromArray EMPTY variables: array=[%s], objectVal=[%s]', array, objectVal);
        return;
    }
    // Remove all the elements equals objectVal from array
    for ( var i=0; i < array.length; ) {       // No i++ here
        var obj = array[i];
        var isEqual = true;
        for ( var prop in objectVal ) {
            if ( obj[prop] !== objectVal[prop] ) {
                isEqual = false;
                break;
            }
        }
        if ( isEqual ) {
            // Objects are equal, so remove the element from the array
            array.splice( pos, 1 );
        } else {
            i++;
        }
    }
    return;
}


/**
 *  Remove objects with given property, possibly several times, from an array
 *  WARNING: Does NOT work with associative arrays!
 */
function removeObjectWithPropertyFromArray( array, propertyName, propertyValue )
{
    if (!array || !array.length || !propertyName || !propertyValue ) {
        console.warn('Warning in removeObjectWithPropertyFromArray EMPTY variables: array=[%s], propertyName=[%s], propertyValue=[%s]',
            array, propertyName, propertyValue );
        return;
    }
    // Remove all the elements equals objectVal from array
    for ( var i=0; i < array.length; ) {       // No i++ here
        if ( array[i][propertyName] == propertyValue ) {
            // The property in Object are equal, so remove the element from the array
            array.splice( pos, 1 );
        } else {
            i++;
        }
    }
    return;
}



/**
 *  Return the first object found with given property from an array, or null
 *      Works for Associative Arrays and Objects too!
 */
function findFirstObjectWithPropertyInArray( array, propertyName, propertyValue )
{
    if (!array || !propertyName || !propertyValue ) {
        console.warn('Warning in findFirstObjectWithPropertyInArray EMPTY variables: array=[%s], propertyName=[%s], propertyValue=[%s]',
            array, propertyName, propertyValue );
        return null;
    }

    // --- Case of associative Arrays (for Objects too, obj.length is undefined, so could work)
    if ( !array.length ) {
        for (var key in array) {
            if ( array[key][propertyName] == propertyValue ) {
                return array[key];
            }
        }
        return null;
    }

    // --- Regular Array: Find the first element which elm.propertyName has value propertyValue from array
    for (var elm of array) {
        if ( elm[propertyName] == propertyValue ) {
            return elm;
        }
    }
    return null;
}



module.exports.removeFromArray = removeFromArray;
module.exports.removeObjectFromArray = removeObjectFromArray;
module.exports.removeObjectWithPropertyFromArray = removeObjectWithPropertyFromArray;
module.exports.findFirstObjectWithPropertyInArray = findFirstObjectWithPropertyInArray;
