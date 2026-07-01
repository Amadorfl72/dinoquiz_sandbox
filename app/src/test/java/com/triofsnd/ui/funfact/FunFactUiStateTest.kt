package com.triofsnd.ui.funfact

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the FunFactUiState data model backing TRIOFSND-26.
 */
class FunFactUiStateTest {

    @Test
    fun defaultState_isIdleWithNullFact() {
        val state = FunFactUiState()
        assertFalse(state.isLoading)
        assertNull(state.factText)
    }

    @Test
    fun loadingState_setsIsLoadingTrue() {
        val state = FunFactUiState(isLoading = true, factText = null)
        assertTrue(state.isLoading)
        assertNull(state.factText)
    }

    @Test
    fun contentState_holdsFactText() {
        val expected = "A T-Rex's bite was stronger than a lion's."
        val state = FunFactUiState(isLoading = false, factText = expected)
        assertFalse(state.isLoading)
        assertEquals(expected, state.factText)
    }

    @Test
    fun copy_preservesImmutability() {
        val original = FunFactUiState(isLoading = false, factText = "Dino fact")
        val updated = original.copy(isLoading = true)
        assertFalse(original.isLoading)
        assertTrue(updated.isLoading)
        assertEquals("Dino fact", updated.factText)
    }
}
