/**
 *  Helper functions on Arrays
 */

/**
 * Remove a given value, possibly several times, from an array
 */
function removeFromArray( array, value )
{
    if (!array || !value) {
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
 * Remove a given Object, possibly several times, from an array
 */
function removeObjectFromArray( array, objectVal )
{
    if (!array || !objectVal || Object.keys( objectVal ).length < 1 ) {
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
 * Remove objects with given property, possibly several times, from an array
 */
function removeObjectWithPropertyFromArray( array, propertyName, propertyValue )
{
    if (!array || !propertyName || !propertyValue ) {
        console.warn('Warning in removeFromArremoveObjectWithPropertyFromArrayray EMPTY variables: array=[%s], propertyName=[%s], propertyValue=[%s]',
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


module.exports.removeFromArray = removeFromArray;
module.exports.removeObjectFromArray = removeObjectFromArray;
module.exports.removeObjectWithPropertyFromArray = removeObjectWithPropertyFromArray;