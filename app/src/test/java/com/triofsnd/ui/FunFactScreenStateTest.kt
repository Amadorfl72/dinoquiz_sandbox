package com.triofsnd.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class FunFactScreenStateTest {

    @Test
    fun state_holdsFactText_nonNull() {
        val state = FunFactScreenState(fact = "Dinos roamed the earth!", onNext = {})
        assertNotNull(state.fact)
        assertEquals("Dinos roamed the earth!", state.fact)
    }

    @Test
    fun state_onNextCallback_isInvokable() {
        var counter = 0
        val state = FunFactScreenState(fact = "fact", onNext = { counter++ })
        state.onNext()
        state.onNext()
        assertEquals(2, counter)
    }

    @Test
    fun state_factText_isNotEmpty_forValidScreen() {
        val state = FunFactScreenState(fact = "A Brachiosaurus was as tall as a 4-story building.", onNext = {})
        assertTrue(state.fact.isNotEmpty())
    }

    private fun assertTrue(message: String, condition: Boolean) {
        if (!condition) throw AssertionError(message)
    }
}
