package com.dinoquiz.ui.start

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class StartScreenViewModelTest {

    private lateinit var viewModel: StartScreenViewModel

    @Before
    fun setUp() {
        viewModel = StartScreenViewModel()
    }

    @Test
    fun initialState_isIdle() {
        assertEquals(StartScreenState.Idle, viewModel.uiState.value)
    }

    @Test
    fun onPlayClicked_transitionsToNavigatingToQuiz() {
        viewModel.onPlayClicked()
        assertEquals(StartScreenState.NavigatingToQuiz, viewModel.uiState.value)
    }

    @Test
    fun onNavigationComplete_resetsToIdle() {
        viewModel.onPlayClicked()
        viewModel.onNavigationComplete()
        assertEquals(StartScreenState.Idle, viewModel.uiState.value)
    }
}
